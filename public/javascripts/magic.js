
function moveTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

// // // 声明一个变量来标识后端渲染是否完成
// let renderCompleted = false;

// // // 定义一个函数来处理后端渲染完成的逻辑
// function handleRenderCompleted() {
//   // 后端渲染已完成，执行你的前端逻辑
//   console.log('后端渲染已完成');
//   // 示例：显示 toast
//   const toast = document.getElementById('liveToast');
//   toast.classList.remove('hide');
//   renderCompleted = true;
// }

// // // 在页面加载完成后发送请求获取数据
// window.addEventListener('DOMContentLoaded', () => {
//   fetch('/')
//     .then(response => response.json())
//     .then(data => {
//       console.log(data);
//       if (data.renderCompleted) {
//         handleRenderCompleted();
//       }
//     })
//     .catch(error => {
//       console.error(error);
//     });
// });




// 上架notion to shopify
// 上架完完後，更新spid到notion
function handleClick(itemString, itemString2) {
  console.log("you hit: ", itemString);
  if (itemString2 === "") {
    console.log("2nd parameter is empty");
  } else {
    console.log("2nd: ", itemString2);
  }

  var button = document.getElementById(itemString + "_btn");
  var tdElement = button.parentNode;

  // 建立 Border Spinner 元素
  var spinner = document.createElement("div");
  spinner.className = "spinner-border text-info spinner-border-sm ms-2";
  spinner.setAttribute("role", "status");
  spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';

  // 在按鈕旁邊插入 Border Spinner
  tdElement.insertBefore(spinner, button.nextSibling);

  // 禁用按鈕
  button.disabled = true;

  var xhr = new XMLHttpRequest();
  xhr.open("post", "/updateConfirm");
  xhr.setRequestHeader("Content-type", "application/json");
  var skuID = JSON.stringify({ SKU: itemString, spid: itemString2 });
  console.log("myJSON:", skuID);
  xhr.send(skuID);

  xhr.onload = function () {
    // 移除 Border Spinner
    spinner.remove();

    var data = JSON.parse(xhr.responseText);
    if (data.message === "資料更新成功") {
      if (itemString2 === "") {
        console.log("創立shopify新商品");
        handleRawData(JSON.parse(data.raw));
        button.disabled = true;
      } else {
        console.log("寫入notion spid");
        button.disabled = true;
        var tdElement = button.parentNode.nextElementSibling;
        var spidButton = document.createElement("button");
        spidButton.setAttribute("id", "sp_" + data.spid);
        spidButton.setAttribute(
          "onclick",
          'modifyShopityItem("' + itemString + '","' + data.spid + '")'
        );
        spidButton.classList.add("btn", "btn-secondary");
        spidButton.textContent = "修改 " + data.spid;
        tdElement.innerHTML = "";
        tdElement.appendChild(spidButton);
        spidButton.disabled = true; // 将按钮设置为 disabled
      }
    }
  };
}

  
//grab data from notion 
function handleRawData(rawData){
    console.log(rawData);
    if (rawData) {
      if (rawData.spid === '') {
        // 如果 spid 是空值，則需要新增商品到 Shopify
        console.log("new:",rawData.sku);
        newRawShopify(rawData);
      } 
    }
}

function newRawShopify(rawData){
    var xhr=new XMLHttpRequest();
    // xhr.open('post','/checkShopifyConnection');
    xhr.open('post','/newRawShopify');
    xhr.setRequestHeader('Content-type','application/json');
    // xhr.send(JSON.stringify(rawData));
    var raw=JSON.stringify(rawData);
    console.log("raw:",raw);
    xhr.send(raw);
    xhr.onload=function(){
        var data=JSON.parse(xhr.responseText);
        console.log("sopify sku:",data.sku);
        console.log("sopify spid:",data.product.id);
        //寫入spid到notion上
        handleClick(data.sku,data.product.id.toString());
    }
}

function modifyShopityItem(sku, spid){
    console.log("sku:",typeof sku,sku);
    spid=parseInt(spid);
    console.log("spid:",typeof spid, spid);

    //spinner
    var button = document.getElementById("sp_"+spid);
    var tdElement = button.parentNode;

    // 建立 Border Spinner 元素
    var spinner = document.createElement("div");
    spinner.className = "spinner-border text-info spinner-border-sm ms-2";
    spinner.setAttribute("role", "status");
    spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';

    // 在按鈕旁邊插入 Border Spinner
    tdElement.insertBefore(spinner, button.nextSibling);

    // 禁用按鈕
    button.disabled = true;
    
    var xhr=new XMLHttpRequest();
    xhr.open('post','/getNotionSkuItem');
    xhr.setRequestHeader('Content-type','application/json');
    var raw = JSON.stringify({ sku:sku, spid:spid });
    console.log("raw:",raw);
    xhr.send(raw);
    xhr.onload=function(){
        var data = JSON.parse(xhr.responseText);
        if (data.status === "success") {
            console.log(data.message);
            // console.log(typeof data.gotU); //string
            var gotU=JSON.parse(data.gotU);
            // console.log(typeof gotU); //object
            // console.log(gotU.title);
            renewShopifyItem(gotU,spinner,button);
        }
    }
}
function renewShopifyItem(gotU,spinner,button){
    // console.log(typeof gotU.spid, gotU.spid);
    var sku=gotU.sku;
    var xhr=new XMLHttpRequest();
    xhr.open('post','/renewShopifyItemAxios');
    xhr.setRequestHeader('Content-type','application/json');
    var raw =  JSON.stringify(gotU);
    console.log("raw:",typeof raw, raw);
    xhr.send(raw);
    xhr.onload=function(){
        var data = JSON.parse(xhr.responseText);
        if (data.status === "success") {
            console.log(data.message);
            console.log(data.product);
            // console.log("sku:",gotU.sku);
            NotionworkDown(sku, button,spinner);
            
        }
    }
}
function NotionworkDown(sku, button,spinner){
    var xhr=new XMLHttpRequest();
    xhr.open('post','/done');
    xhr.setRequestHeader('Content-type','application/json');
    xhr.send(JSON.stringify({sku:sku}));
    xhr.onload=function(){
        // 移除 Border Spinner
        spinner.remove();
        var data = JSON.parse(xhr.responseText);
        if (data.status === "success") {
            console.log(data.message);
            var tdElement = button.parentNode.previousElementSibling;
            var tdText = tdElement.textContent;
            if (tdText === "需要修改") {
                tdElement.textContent = "修改完成";
                tdElement.classList.remove("text-danger");
                tdElement.classList.add("text-primary");
            }
        }
    }
}
function renewShopifyItem_test(gotU){
    var xhr=new XMLHttpRequest();
    xhr.open('post','/testGetProductByIdAxios');
    // xhr.open('post','/testGetProductByIdcURL');
    xhr.setRequestHeader('Content-type','application/json');
    var raw =  JSON.stringify({"productId":8078645526742});
    console.log("raw:",typeof raw, raw);
    xhr.send(raw);
    xhr.onload=function(){
        var data = JSON.parse(xhr.responseText);
        if (data.status === "success") {
            console.log(data.message);
            console.log("hello ",data.product);
        }else{
            console.log(data.message);
        }
    }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var createProductsTime = 15000; // 创建产品时间间隔（毫秒）

function LaunchProducts() {
document.getElementById('All_Shopify').disabled = true;
var btns = document.querySelectorAll("[id$='_btn']");
var index = 0;
var startTime = new Date(); // 记录开始时间

async function clickNextButton() {
  for (let i = 0; i < btns.length; i++) {
    const currentBtn = btns[i];

    if (!currentBtn.disabled) {
      simulateButtonClick(currentBtn);
      currentBtn.click(); // 触发按钮的点击事件
      scrollToButton(currentBtn); // 滚动到按钮所在的行
    }

    await sleep(createProductsTime); // createProductsTime毫秒后自动点击下一个按钮
  }

  // 所有按钮点击完成后显示 Toast
  await sleep(1000); // 等待1秒
  showSuccessToast();
}

function simulateButtonClick(button) {
  console.log("Clicking button:", button.id);

  // 添加按钮点击的可视化效果，例如改变按钮的样式或添加其他动画
  button.classList.add("clicked");

  // 模拟按钮点击后恢复原样的效果
  setTimeout(function () {
    button.classList.remove("clicked");
  }, 500); // 500毫秒后恢复原样
}

function scrollToButton(button) {
  var row = button.closest("tr");
  if (row) {
    row.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}

function showSuccessToast() {
  var toast = new bootstrap.Toast(document.getElementById('liveToast'));

  // 计算经过的时间并格式化
  var endTime = new Date();
  var elapsedTime = endTime - startTime; // 计算经过的毫秒数
  var seconds = Math.floor(elapsedTime / 1000) % 60;
  var minutes = Math.floor(elapsedTime / 1000 / 60) % 60;
  var hours = Math.floor(elapsedTime / 1000 / 60 / 60);

  // 格式化时间为时分秒
  var timeString = hours + "小时 " + minutes + "分钟 " + seconds + "秒";

  // 设置 Toast 上的时间显示
  var timeElement = toast._element.querySelector('.toast-header small');
  if (timeElement) {
    timeElement.textContent = timeString;
  }

  // 添加事件监听器，当关闭按钮被点击时隐藏 Toast
  var closeButton = toast._element.querySelector('.toast-header button');
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      toast.hide();
    });
  }

  toast.show();
}

clickNextButton(); // 开始点击第一个按钮
}




var renewProductsTime = 8000;

function UPtoDate() {
  document.getElementById('uptodata').disabled = true;
  var btns = document.querySelectorAll("button[id^='sp_']:not([disabled])");
  var index = 0;
  var startTime = new Date(); // 记录开始时间

  async function clickNextButton() {
    for (let i = 0; i < btns.length; i++) {
      const currentBtn = btns[i];

      if (!currentBtn.disabled) {
        simulateButtonClick(currentBtn);
        currentBtn.click(); // 触发按钮的点击事件
        scrollToButton(currentBtn); // 滚动到按钮所在的行
      }

      await sleep(renewProductsTime); // renewProductsTime毫秒后自动点击下一个按钮
    }

    // 所有按钮点击完成后显示 Toast
    await sleep(1000); // 等待1秒
    showSuccessToast();
  }

  function simulateButtonClick(button) {
    console.log("Clicking button:", button.id);

    // 添加按钮点击的可视化效果，例如改变按钮的样式或添加其他动画
    button.classList.add("clicked");

    // 模拟按钮点击后恢复原样的效果
    setTimeout(function () {
      button.classList.remove("clicked");
    }, 500); // 500毫秒后恢复原样
  }

  function scrollToButton(button) {
    var row = button.closest("tr");
    if (row) {
      row.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  function showSuccessToast() {
    var toast = new bootstrap.Toast(document.getElementById('liveToast'));
  
    // 设置 Toast 上的文本内容
    var messageElement = toast._element.querySelector('.toast-body');
    if (messageElement) {
      messageElement.textContent = '所有商品已更新到 Shopify 囉 ^_^';
    }
  
    // 计算经过的时间并格式化
    var endTime = new Date();
    var elapsedTime = endTime - startTime; // 计算经过的毫秒数
    var seconds = Math.floor(elapsedTime / 1000) % 60;
    var minutes = Math.floor(elapsedTime / 1000 / 60) % 60;
    var hours = Math.floor(elapsedTime / 1000 / 60 / 60);
  
    // 格式化时间为时分秒
    var timeString = hours + "小时 " + minutes + "分钟 " + seconds + "秒";
  
    // 设置 Toast 上的时间显示
    var timeElement = toast._element.querySelector('.toast-header small');
    if (timeElement) {
      timeElement.textContent = timeString;
    }

    // 添加事件监听器，当关闭按钮被点击时隐藏 Toast
    var closeButton = toast._element.querySelector('.toast-header button');
    if (closeButton) {
      closeButton.addEventListener('click', function() {
        toast.hide();
      });
    }
  
    toast.show();
  }
  

  // 增加 sleep 函数
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clickNextButton(); // 开始点击第一个按钮
}


