# 微信小程序 转 支付宝小程序


## 项目描述

* 微信小程序一键转化为支付宝小程序


## 安装使用

### 使用 npm 


    // 安装
    npm install wx2ant -g
    // 转换
    wx2ant ./微信小程序目录 ./支付宝小程序目录

### 直接下载使用
    
    // 下载
    git clone https://github.com/CubePoint/wx2ant.git wx2ant
    cd ./wx2ant
    npm install
    // 转换
    node index.js ./微信小程序目录 ./支付宝小程序目录


####


## 注意事项
1. 会在支付宝小程序目录下./utils/引入wzapi.js,作为微信支付宝api兼容库
2. 会在支付宝小程序目录下./app.acss文件顶部引入antdefault.css中的样式，作为样式兼容
3. textarea标签需要</textarea>闭合标签，否则转义会失败
4. 支付宝端scrollview 无法height:100%需要absulote
5. 支付宝端picker无法设置样式，需要在picker里面套个view设置
6. 特殊处理,支付宝不支持标签picker mode=date模式，会改用view标签，picker中的属性都会用data-,tapDatePicker作为触发事件
    
        // 微信小程序-未转换
        <picker mode="date" value="{{currentDate}}" fields="month" bindchange="filterDate">
          {{currentDate}}
        </picker>
        // 支付宝小程序-转换后
        <view data-value="currentDate" data-fields="month" data-bindchange="filterDate" onTap="tapDatePicker">
          {{currentDate}}
        </view>

> ps：此工具基于 [wxml2axml](https://www.npmjs.com/package/wxml2axml) 和 [wxmp2antmp](https://www.npmjs.com/package/wxmp2antmp) 改动

> ps：最新兼容更新时间 2018.8.1
