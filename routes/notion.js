var express = require('express');
var router = express.Router();


const { Client } = require('@notionhq/client');


const notion = new Client({
  auth: 'secret_0dN4tJfxQ0VetdP9EgkNbjBftSrf3Ftwd1xFwegj8WX', // 替換為您的 Notion API Token
});
const databaseId = 'c326cf7429544b80b3f6f62fa974a05b';
// 處理根路由
router.get('/', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: databaseId
    });

    console.log(response.results);
    // const items = response.results.map(result => result.properties['StorageNo'].title[0].plain_text);
    const items = response.results.map(result => {
      const storageNo = result.properties['SKU'].title[0].plain_text;
      console.log(storageNo);
      if (storageNo && storageNo.length > 0) {
        return storageNo;
      }
      return ''; // 或者根據需要返回其他預設值
    });
    // const items = response.results.map(result => {
    //   const productName = result.properties['品名'];
    //   console.log(productName); // 檢查 productName 的值
    //   if (productName && productName.length > 0) {
    //     return productName[0].plain_text;
    //   }
    // });
    // const items = response.results.map(result => {
    //   const productName = result.properties['品名'];
    //   console.log(productName.rich_text[0].plain_text); // 檢查 productName 的值
    //   if (productName && productName.rich_text.length > 0) {
    //     return productName.rich_text[0].plain_text;
    //   }
    // });
    
    
    
    
    
    res.render('index', { items });


  } catch (error) {
    console.log(error);
    console.error(error);
    console.error(error.body);
    res.status(500).send('Internal Server Error');
  }
});





// /* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

module.exports = router;
