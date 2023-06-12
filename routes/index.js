const express = require('express');
const router = express.Router();
const { Client } = require('@notionhq/client');
const axios = require('axios');
const Shopify = require('shopify-api-node');
const { exec } = require('child_process');
const util = require('util');
const execPromisified = util.promisify(exec);

require('dotenv').config();


const notion = new Client({
  auth: process.env.NoAPIKEY, // 替換為您的 Notion API Token
});
const YOUR_NOTION_API_KEY=process.env.NoAPIKEY;
const databaseId = process.env.NoDBID_Product;

const shopify = new Shopify({
  shopName: process.env.ShopID,
  apiKey: process.env.ShopifyKey,
  password: process.env.ShopifyToken
});

// get notion product table and render to index.ejs
router.get('/', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: databaseId
    });

    const items = response.results.map(result => {
      const item = {
        SKU: result.properties['SKU']?.title[0]?.plain_text || '',
        確認: result.properties['確認']?.checkbox || '',
        分類: result.properties['分類']?.select?.name || '',
        tag: result.properties['tag']?.multi_select?.map(tag => tag.name) || [], // 新增對 "tag" 欄位的處理
        品名: result.properties['品名']?.rich_text[0]?.plain_text || '',
        定價: result.properties['定價']?.number || 0,
        庫1: result.properties['庫1']?.number || '',
        庫2: result.properties['庫2']?.number || '',
        memo: result.properties['memo']?.rich_text[0]?.plain_text || '',
        圖片: result.properties['圖片']?.files[0]?.name || '',
        更新: result.properties['更新']?.checkbox,
        spid: result.properties['spid']?.rich_text[0]?.plain_text || '',
      };
      return item;
    });
      items.sort((a, b) => a.SKU.localeCompare(b.SKU));
      res.render('index', { items });
      // res.send({ renderCompleted: true });
      // res.render('index', { items }, () => {
      //   // 后端渲染完成后发送消息给前端
      //   res.send({ renderCompleted: true });
      // });
  } catch (error) {
      console.error(error.body);
      res.status(500).send('Internal Server Error');
  }
});

//cancel renew button on notion after renew shopify item
router.post('/done', async function(req, res) {
    const sku=req.body.sku;
    try {
      // 使用 Notion API 檢索資料庫中具有特定 SKU 的頁面
      const response = await axios.post('https://api.notion.com/v1/databases/'+databaseId+'/query', {
        filter: {
          property: 'SKU',
          title: {
            equals: sku
          }
        }
      }, {
        headers: {
          'Authorization': 'Bearer '+YOUR_NOTION_API_KEY,
          'Notion-Version': '2022-02-22'
        }
      });
      if (response.status === 200) {
        const databaseData = response.data;
  
        if (databaseData.results.length > 0) {
          const pageId = databaseData.results[0].id;
    
          const updatedValue = false;
          // 使用 Notion API 更新頁面
        const updateResponse = await axios.patch(`https://api.notion.com/v1/pages/${pageId}`, {
          properties: {
            '更新': {
              checkbox: updatedValue
            }
          }
        }, {
          headers: {
            'Authorization': 'Bearer '+YOUR_NOTION_API_KEY,
            'Notion-Version': '2022-02-22'
          }
        });

        if (updateResponse.status === 200) {
          res.send({
            "status":"success",
            "message":"renew complete",
          });
        } else {
          console.error('更新資料時發生錯誤', updateResponse.data);
          res.status(500).send({"status":"error","message":"500 資料更新失敗"});
        }
      } else {
        res.status(404).send({"status":"error","message":'404 找不到對應的資料'});
      }
    } else {
      console.error('檢索資料時發生錯誤', response.data);
      res.status(500).send({"status":"error","message":'500 資料更新失敗'});
    }
  } catch (error) {
    console.error('發生錯誤', error);
    res.status(500).send({"status":"error","message":'500 資料更新失敗'});
  }
});

//receive SKU and spid (write spid to notion and cancel renew button)
router.post('/updateConfirm', async function(req, res) {
  const skuToUpdate = req.body.SKU;
  const spidToUpdate=req.body.spid;
  console.log("post value:",skuToUpdate);
  try {
    // 使用 Notion API 檢索資料庫中具有特定 SKU 的頁面
    const response = await axios.post('https://api.notion.com/v1/databases/'+databaseId+'/query', {
      filter: {
        property: 'SKU',
        title: {
          equals: skuToUpdate
        }
      }
    }, {
      headers: {
        'Authorization': 'Bearer '+YOUR_NOTION_API_KEY,
        'Notion-Version': '2022-02-22'
      }
    });

    if (response.status === 200) {
      const databaseData = response.data;

      if (databaseData.results.length > 0) {
        const pageId = databaseData.results[0].id;
        const fieldValue = databaseData.results[0].properties['更新'].checkbox;

        // 取反欄位的值
        const updatedValue = false;
       

        var gotU={};
        gotU['sku']=skuToUpdate;
        gotU['title']=databaseData.results[0].properties['品名']?.rich_text[0]?.plain_text || '';
        gotU['product_type']=databaseData.results[0].properties['分類']?.select?.name || '';
        gotU['price']=databaseData.results[0].properties['定價']?.number || 0;
        gotU['vendor']="Hot Toddy Miracle Accessories";
        gotU['src']=databaseData.results[0].properties['圖片']?.files[0]?.name || '';
        gotU['inventory_quantity_L1_68315971798']=databaseData.results[0].properties['庫1']?.number || 0;
        gotU['inventory_quantity_L2_72517222614']=databaseData.results[0].properties['庫2']?.number || 0;
        gotU['spid']=databaseData.results[0].properties['spid']?.rich_text[0]?.plain_text || spidToUpdate;
        gotU['tag'] = databaseData.results[0].properties['tag']?.multi_select?.map(tag => tag.name) || []; // 新增對 "tag" 欄位的處理
        // 使用 Notion API 更新頁面
        const updateResponse = await axios.patch(`https://api.notion.com/v1/pages/${pageId}`, {
          properties: {
            '更新': {
              checkbox: updatedValue
            },
            'spid': {
              rich_text: [{
                text: {
                  content: spidToUpdate
                }
              }]
            }
          }
        }, {
          headers: {
            'Authorization': 'Bearer '+YOUR_NOTION_API_KEY,
            'Notion-Version': '2022-02-22'
          }
        });

        if (updateResponse.status === 200) {
          console.log(gotU);
          res.send({
            "message":"資料更新成功",
            "answer":skuToUpdate,
            "raw":JSON.stringify(gotU),
            "spid":spidToUpdate
          });
        } else {
          console.error('更新資料時發生錯誤', updateResponse.data);
          res.status(500).send({"message":"資料更新失敗"});
        }
      } else {
        res.status(404).send({"message":'找不到對應的資料'});
      }
    } else {
      console.error('檢索資料時發生錯誤', response.data);
      res.status(500).send({"message":'資料更新失敗'});
    }
  } catch (error) {
    console.error('發生錯誤', error);
    res.status(500).send({"message":'資料更新失敗'});
  }
});

//verify shopifyConnection (test)
router.post('/checkShopifyConnection', async (req, res) => {
  try {
    // 進行一個簡單的 API 呼叫
    const shop = await shopify.shop.get();

    console.log('Shopify 連線正常');
    console.log('商店資訊:', shop);

    // 回傳成功訊息給客戶端
    res.status(200).send({ message: 'Shopify 連線正常', shop });
  } catch (error) {
    console.error('檢查 Shopify 連線時發生錯誤:', error);

    // 回傳錯誤訊息給客戶端
    res.status(500).send({ message: '檢查 Shopify 連線時發生錯誤', error });
  }
});

//create new shopify item
router.post('/newRawShopify', async function(req, res) {
  console.log("req_newRaw:", req.body);
  try {
    // 從請求中取得商品資料
    const { sku, title, product_type, price, vendor, src, inventory_quantity_L1_68315971798, inventory_quantity_L2_72517222614,tag } = req.body;

    // 建立商品
    const createdProduct = await shopify.product.create({
      title,
      vendor,
      product_type,
      tags: tag, // 新增對 "tag" 欄位的處理
      variants: [
        {
          sku,
          price,
          inventory_management: "shopify",
          inventory_quantity: inventory_quantity_L1_68315971798,
          location_id: 68315971798
        }
      ],
      images: [
        {
          src
        }
      ]
    });

    res.send({ success: true, message: '商品已成功建立', sku:req.body.sku, product: createdProduct });
  } catch (error) {
    console.error('新增商品到 Shopify 時發生錯誤：', error);
    res.status(500).send({ success: false, error: '新增商品到 Shopify 時發生錯誤' });
  }
});

//grab particular notion item while sku matched (return gotU Json format with shopify key and value)
router.post('/getNotionSkuItem', async (req, res) => {
  try {
    const { sku, spid } = req.body;

    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'SKU',
        title: {
          equals: sku,
        },
      },
    });

    if (response.results.length === 0) {
      // 若找不到相符的 SKU，回傳錯誤訊息給前端
      return res.status(404).json({ message: '找不到相符的 SKU' });
    }

    const result = response.results[0];

    const gotU = {
      sku: sku,
      title: result.properties['品名']?.rich_text[0]?.plain_text || '',
      product_type: result.properties['分類']?.select?.name || '',
      price: result.properties['定價']?.number || 0,
      vendor: 'Hot Toddy Miracle Accessories',
      src: result.properties['圖片']?.files[0]?.name || '',
      inventory_quantity_L1_68315971798: result.properties['庫1']?.number || 0,
      inventory_quantity_L2_72517222614: result.properties['庫2']?.number || 0,
      spid: result.properties['spid']?.rich_text[0]?.plain_text || spid,
      tag: result.properties['tag']?.multi_select?.map(tag => tag.name) || [],
    };

    res.send({
      "status":"success",
      "message":"獲取object成功",
      "gotU":JSON.stringify(gotU)
    });
  } catch (error) {
    console.error(error.body);
    res.status(500).send({
      "message":'Internal Server Error'
    });
  }
});

// shopify-api-node, update method doesn't work (no reasson)
router.post('/renewShopifyItemNG', async (req, res) => {
  console.log(req.body);
  try {
    const { spid, sku, title, product_type, price, vendor, src, inventory_quantity_L1_68315971798, inventory_quantity_L2_72517222614, tag } = req.body;
    console.log(typeof spid, parseInt(spid));
    console.log(title);
    // 使用 spid 搜尋相符的 Shopify 商品
    const product = await shopify.product.get(parseInt(spid));
    // const product = await shopify.product.get(parseInt(spid));


    // 更新商品屬性
    product.title = title;
    // product.product_type = product_type;
    // product.price = price;
    // product.vendor = vendor;
    // product.tags = tag;
    //product.images = [{ src: src }]; // 假設圖片資訊以陣列形式提供
    // product.variants.forEach(variant => {
    //   if (variant.sku === sku) {
    //     // 假設您有兩個庫存屬性分別為 `inventory_quantity_L1_68315971798` 和 `inventory_quantity_L2_72517222614`
    //     variant.metafields_global = [
    //       {
    //         key: '68315971798',
    //         value: inventory_quantity_L1_68315971798.toString(),
    //         value_type: 'integer',
    //         namespace: 'global',
    //       },
    //       {
    //         key: '72517222614',
    //         value: inventory_quantity_L2_72517222614.toString(),
    //         value_type: 'integer',
    //         namespace: 'global',
    //       },
    //     ];
    //   }
    // });
    console.log("product:",product);
    // 更新商品
    // const updatedProduct = await shopify.product.update(product);
    const updatedProduct = await shopify.product.update({ id: product.id, title: product.title });

    // 執行完更新後，可以根據情況回傳成功或失敗訊息給前端
    res.send({ 
      status: 'success', 
      message: 'Shopify 商品更新成功',
      product: updatedProduct 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: 'error', message: '內部伺服器錯誤' });
  }
});

// partial cURL function test work with title 
router.post('/renewShopifyItemcURL', async (req, res) => {
  try {
    const { spid, sku, title, product_type, price, vendor, src, inventory_quantity_L1_68315971798, inventory_quantity_L2_72517222614, tag } = req.body;
    
    var spid_number=parseInt(spid);
    // 使用 execPromisified 方法執行 curl 命令
    const { stdout, stderr } = await execPromisified(`curl -X PUT \
      -H "X-Shopify-Access-Token: ${process.env.ShopifyToken}" \
      -H "Content-Type: application/json" \
      -d '{
        "product": {
          "id": ${spid_number},
          "title": "${title}"
        }
      }' \
      "https://${process.env.ShopID}.myshopify.com/admin/api/2023-04/products/${spid}.json"`);

  
      const updatedProduct = JSON.parse(stdout);
    
    res.send({ 
      status: 'success', 
      message: 'Shopify 商品更新成功',
      product: updatedProduct 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: 'error', message: '內部伺服器錯誤' });
  }
});

// axios shopify Item update (single product)
router.post('/renewShopifyItemAxios', async (req, res) => {
  try {
    const { spid, sku, title, product_type, price, vendor, src, inventory_quantity_L1_68315971798, inventory_quantity_L2_72517222614, tag } = req.body;

    const spid_number = parseInt(spid);

    // 更新商品內容
    const updateProductResponse = await axios.put(
      `https://${process.env.ShopID}.myshopify.com/admin/api/2023-04/products/${spid}.json`,
      {
        product: {
          id: spid_number,
          title: title,
          product_type: product_type,
          vendor: vendor,
          tags: tag
        }
      },
      {
        headers: {
          'X-Shopify-Access-Token': process.env.ShopifyToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const updatedProduct = updateProductResponse.data.product;

    // 找到要更新價格的變體
    const variants = updatedProduct.variants;
    const variantToUpdate = variants.find((variant) => variant.sku === sku);
    if (!variantToUpdate) {
      return res.status(404).send({
        status: 'error',
        message: '找不到相應的變體'
      });
    }

    // 更新變體價格
    variantToUpdate.price = price.toString();

    // 執行PUT請求，更新變體的價格
    const updateVariantResponse = await axios.put(
      `https://${process.env.ShopID}.myshopify.com/admin/api/2023-04/variants/${variantToUpdate.id}.json`,
      {
        variant: {
          id: variantToUpdate.id,
          price: variantToUpdate.price
        }
      },
      {
        headers: {
          'X-Shopify-Access-Token': process.env.ShopifyToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const updatedVariant = updateVariantResponse.data.variant;

    // 找到庫存項目的ID
    const inventoryItemID = variantToUpdate.inventory_item_id;

    // 提取 L1 和 L2 的數字部分
    const locationID_L1 = parseInt(Object.keys(req.body).find(key => key.startsWith('inventory_quantity_L1_')).split('_').pop());
    const locationID_L2 = parseInt(Object.keys(req.body).find(key => key.startsWith('inventory_quantity_L2_')).split('_').pop());

    // 更新庫存（L1）
    const updateInventoryL1Response = await axios.post(
      `https://${process.env.ShopID}.myshopify.com/admin/api/2023-04/inventory_levels/set.json`,
      {
        location_id: locationID_L1,
        inventory_item_id: inventoryItemID,
        available: req.body.inventory_quantity_L1_68315971798
      },
      {
        headers: {
          'X-Shopify-Access-Token': process.env.ShopifyToken,
          'Content-Type': 'application/json'
        }
      }
    );

    // 更新庫存（L2）
    const updateInventoryL2Response = await axios.post(
      `https://${process.env.ShopID}.myshopify.com/admin/api/2023-04/inventory_levels/set.json`,
      {
        location_id: locationID_L2,
        inventory_item_id: inventoryItemID,
        available: req.body.inventory_quantity_L2_72517222614
      },
      {
        headers: {
          'X-Shopify-Access-Token': process.env.ShopifyToken,
          'Content-Type': 'application/json'
        }
      }
    );

    const updatedInventoryL1 = updateInventoryL1Response.data;
    const updatedInventoryL2 = updateInventoryL2Response.data;

    const successMessage = 'Shopify 商品更新成功';
    const priceMessage = updateVariantResponse.status === 200 ? '價格更新成功' : '價格更新失敗';
    const inventoryL1Message = updateInventoryL1Response.status === 200 ? '庫存 L1 更新成功' : '庫存 L1 更新失敗';
    const inventoryL2Message = updateInventoryL2Response.status === 200 ? '庫存 L2 更新成功' : '庫存 L2 更新失敗';

    res.send({
      status: 'success',
      message: `${successMessage}, ${priceMessage}, ${inventoryL1Message}, ${inventoryL2Message}`,
      product: updatedProduct,
      variant: updatedVariant,
      inventoryL1: updatedInventoryL1,
      inventoryL2: updatedInventoryL2
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: 'error', message: '內部伺服器錯誤' });
  }
});



module.exports = router;
