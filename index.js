#!/usr/bin/env node
var path = require('path');
var fs = require('fs');
var argv = process.argv;
var wxmp2antmp = require('./lib/wxmp2antmp');

if (argv.length < 4) {
    console.log('请输入正确的参数，wx2ant 微信小程序目录 支付宝小程序目录 如： wx2ant wxmp antmp');
    process.exit(1);
}
var fromPathBase = path.resolve(argv[2]);
var toPathBase = path.resolve(argv[3]);

function walk (fromPath, toPath) {
    var fileList = fs.readdirSync(fromPath);
    for (var index = 0; index < fileList.length; index++) {
        var name = fileList[index];
        var filePath = path.resolve(fromPath, name);
        var toFilePath = path.resolve(toPath, name.replace(/\.wxml$/, '.axml').replace(/\.wxss$/, '.acss'));
        if (isUnwanted(name)) {
            continue;
        }
        if (fs.lstatSync(filePath).isDirectory()) {
            fs.mkdirSync(toFilePath);
            walk(filePath, toFilePath);
        } else {
            wxmp2antmp.to(filePath, toFilePath, fromPathBase)
            // fs.createReadStream(filePath).pipe(fs.createWriteStream(toFilePath));
        }
    }
}

if (fs.existsSync(toPathBase)) {
    console.log(`${toPathBase}文件夹已存在`);
} else if (fs.existsSync(fromPathBase)) {
    fs.mkdirSync(toPathBase);
    walk(fromPathBase, toPathBase);
    const wzapi_js = fs.readFileSync(path.join(__dirname,'./lib/wzapi.js'), 'utf8');
    writeFile(`${toPathBase}/utils/wzapi.js`, wzapi_js, {flag:'w+'}, false);
} else {
    console.log(`${fromPathBase}文件夹不存在`);
}
  
function isUnwanted(filename) {
return /(?:Thumbs\.db|\.DS_Store|\.git|node_modules)$/i.test(filename);
}
// 创建文件自动生成文件夹
function writeFile(dstpath,infile,opt,async) {
  dstpath = dstpath.replace(/\\/g,'/');
	var dirary = dstpath.split('/');
    var dirtmp = dstpath;
    for (var i=dirary.length-1;i>=0;i--) {
        dirtmp = dirtmp.slice(0,(dirary[i].length+1)*-1);
		try {
			fs.accessSync(dirtmp, fs.constants.F_OK | fs.constants.W_OK);
            break;
		}catch (err) {
			//不存在
			fs.mkdirSync(dirtmp);
		}
    }
  if (async) {
    fs.writeFile(dstpath, infile,opt,function() {});
  }else {
    fs.writeFileSync(dstpath, infile,opt);
  }
}