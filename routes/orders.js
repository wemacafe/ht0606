var express = require('express');
var router = express.Router();
const { Client } = require('@notionhq/client');
const axios = require('axios');
const Shopify = require('shopify-api-node');
const { log } = require('util');

router.get('/', async (req, res) => {
  try {
    const shopifyUrl = 'https://hottoddy444.myshopify.com';
    const apiKey = process.env.ShopifyKey;
    const password = process.env.ShopifyToken;
    const status = 'any';

    const response = await axios.get(
      `${shopifyUrl}/admin/api/2023-04/orders.json?status=${status}`,
      {
        auth: {
          username: apiKey,
          password: password,
        },
      }
    );

    const orders = response.data.orders;

    if (Array.isArray(orders) && orders.length > 0) {
      const MYorders = orders
        .map(function (order) {
          let storeId = 'N/A';
          if (order.note_attributes) {
            order.note_attributes.forEach(function (attribute) {
              if (attribute.name === '門市代號(CvsStoreId)') {
                storeId = attribute.value;
              }
            });
          }

          const items = order.line_items.map(function (item) {
            return '[' + item.sku + '][' + item.title + '] x ' + item.quantity;
          });

          let shippingMethod = 'N/A';
          if (order.shipping_lines && order.shipping_lines.length > 0) {
            if (order.shipping_lines[0].code.includes('(')) {
              shippingMethod = order.shipping_lines[0].code.split('(')[0];
            } else {
              shippingMethod = order.shipping_lines[0].code.split(' ')[0];
            }
          }

          const createDate = new Date(order.created_at);
          const year = createDate.getFullYear();
          const month = createDate.getMonth() + 1;
          const day = createDate.getDate();
          const formattedDate = year + '/' + month + '/' + day;

          return {
            Name: order.shipping_address
              ? order.shipping_address.last_name +
                order.shipping_address.first_name
              : 'N/A',
            Phone:
              order.shipping_address && order.shipping_address.phone
                ? order.shipping_address.phone
                    .replace(/\s/g, '')
                    .replace('+886', '0')
                : 'N/A',
            Market: storeId,
            Goods: '常溫',
            Items: items,
            Total:
              Math.floor(order.total_price) -
              Math.floor(order.total_shipping_price_set.shop_money.amount),
            Shipping_Cost: Math.floor(
              order.total_shipping_price_set.shop_money.amount
            ),
            Create_Date: formattedDate,
            Memo: order.note,
            ID: order.id,
            No: order.name,
            Financial: order.financial_status,
            Shipping_Method: shippingMethod,
            fulfillments_id:
              order.fulfillments && order.fulfillments.length > 0
                ? order.fulfillments.map((fulfillment) => fulfillment.id)
                : [],
            tracking_number:
              order.fulfillments && order.fulfillments.length > 0
                ? order.fulfillments[0].tracking_number
                : null,
            fulfillment_status: order.fulfillment_status,
            cancelled_at: order.cancelled_at,
          };
        })
        .filter(function (order) {
          return order.Shipping_Method !== 'N/A';
        });
      // 過濾 7-11賣貨便 的訂單
      const sevenElevenOrders = MYorders.filter(function (order) {
        return (
          order.Shipping_Method === '7-11賣貨便' ||
          order.Shipping_Method === '7-11貨到付款' ||
          (order.Shipping_Method === '7-11貨到付款滿千免運' &&
            order.cancelled_at === null &&
            order.Financial !== 'voided' &&
            order.Market !== 'N/A')
        );
      });
      // 過濾 超商取貨 的訂單
      const convenienceStoreOrders = MYorders.filter(function (order) {
        return (
          order.Shipping_Method === '7-11取貨不付款信用卡刷卡' ||
          order.Shipping_Method === '7-11取貨不付款信用卡刷卡滿1500免運' ||
          (order.Shipping_Method === '超商取貨' &&
            order.fulfillment_status === null &&
            order.cancelled_at === null &&
            order.Financial !== 'voided' &&
            order.Market !== 'N/A')
        );
      });
      // 取代原本的 orders
      response.data.orders = MYorders;

      // 新增 MYorders 到 response.data
      response.data.MYorders = MYorders;
      response.data.sevenElevenOrders = sevenElevenOrders;
      response.data.convenienceStoreOrders = convenienceStoreOrders;

      res.render('orders', response.data);
    } else {
      res.render('orders', { orders: [], MYorders: [] });
    }
  } catch (error) {
    console.error('Error retrieving Shopify orders:', error);
    res.status(500).json({ error: 'Error retrieving Shopify orders' });
  }
});

const shopify = new Shopify({
  shopName: process.env.ShopID,
  apiKey: process.env.ShopifyKey,
  password: process.env.ShopifyToken,
  apiVersion: '2023-04',
});
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Basic ${Buffer.from(
    `${process.env.ShopifyKey}:${process.env.ShopifyToken}`
  ).toString('base64')}`,
};

router.post('/updateShippingStatus_try', (req, res) => {
  const { orderID, shippingNo, fulfillments_id } = req.body;
  // step 1. fulfillment_orders
  // GET /admin/api/2023-04/orders/${orderID}/fulfillment_orders.json
  const url = `https://${process.env.ShopID}.myshopify.com/admin/api/2023-04/orders/${orderID}/fulfillment_orders.json`;
  axios
    .get(url, { headers })
    .then((response) => {
      // 处理返回的数据
      const fulfillmentOrders = response.data;
      const fulfillment_order_id = response.data.fulfillment_orders[0].id;
      // step 2. fulfillment_request
      // POST /admin/api/2023-04/fulfillment_orders/${fulfillment_order_id}/fulfillment_request.json
      axios
        .post(
          `https://${process.env.ShopID}.myshopify.com/admin/api/2023-04/fulfillment_orders/${fulfillment_order_id}/fulfillment_request.json`,
          { fulfillment_request: { message: 'Fulfill this ASAP please.' } },
          { headers }
        )
        .then((response) => {
          // 处理返回的数据
          const fulfillmentRequest = response.data;
          // 进行下一步操作
          // step 3. fulfillment_request_accept
          // POST /admin/api/2023-04/fulfillment_orders/${fulfillment_order_id}/fulfillment_request/accept.json
          // step 4. create fulfillment
          // POST /admin/api/2023-04/fulfillments.json
        })
        .catch((error) => {
          // 处理错误
          console.error(error.response.data);
          res.status(500).json({ error: 'step2: An error occurred' });
        });
    })
    .catch((error) => {
      // 处理错误
      console.error(error);
      res.status(500).json({ error: 'step1: An error occurred' });
    });
});

router.post('/updateShippingStatus', (req, res) => {
  // fulfillments_id might be null
  const { orderID, shippingNo, fulfillments_id } = req.body;

  // step 1. fulfillment_orders
  // GET /admin/api/2023-04/orders/${orderID}/fulfillment_orders.json
  // step 2. fulfillment_request
  // POST /admin/api/2023-04/fulfillment_orders/${from_Orders}/fulfillment_request.json
  // step 3. fulfillment_request_accept
  // POST /admin/api/2023-04/fulfillment_orders/${from_Orders}/fulfillment_request/accept.json
  // step 4. create fulfillment
  // POST /admin/api/2023-04/fulfillments.json

  // fulfillment
  const fulfillment_data = {
    fulfillment: {
      tracking_info: {
        company: '7-11MHB',
        number: shippingNo,
        url: `https://eservice.7-11.com.tw/e-tracking/search.aspx?ProductNum=${shippingNo}&utm_source=POS&utm_medium=QRcode&utm_campaign=C2CS`,
      },
    },
  };
  // Shopify API - fulfillment
  const fulfillment_config = {
    method: 'post',
    url: `https://hottoddy444.myshopify.com/admin/api/2023-04/fulfillments/${fulfillments_id}/update_tracking.json`,
    auth: {
      username: process.env.ShopifyKey,
      password: process.env.ShopifyToken,
    },
    headers: {
      'Content-Type': 'application/json',
    },
    data: JSON.stringify(fulfillment_data),
  };
  // 发送请求到Shopify API -fulfillment
  axios(fulfillment_config)
    .then((response) => {
      console.log('跟踪信息已更新：', response.data);
      res.json({ message: 'Tracking information updated successfully' });
    })
    .catch((error) => {
      console.error('更新跟踪信息时出错：', error.response.data);
      res.status(500).json({ error: 'Failed to update tracking information' });
    });
});

module.exports = router;
