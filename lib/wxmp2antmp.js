var wxml2axml = require('./wxmp2axml/index.js');
var fs = require('fs');
var shelljs = require('shelljs');

//[cp]
var json_w2a = {
    '"navigationBarTitleText"': '"defaultTitle"',
    '"enablePullDownRefresh"': '"pullRefresh"',
    '"navigationBarBackgroundColor"': '"titleBarColor"'
}

function to (from, to, fromPathBase) {
    file = fs.readFileSync(from, 'utf8');
    if (/\.wxml$/i.test(from)) {
        // console.log(from)
        file = wxml2axml.compiler(file);
        fs.writeFile(to, file, function (err) {
            if (err) throw err;
        });
    } else if (/\.js$/i.test(from)) {
        //[cp]
        // file = 'const wx = my;\n' + file;
        file = file.replace(/wx\./g, 'Wz.')
        if (from.indexOf("\\pages\\")>=0) {
            file = "const Wz = require('../../utils/wzapi');\n" + file;
            file = file.replace(/let self;/g, 'var self;');
        }
        if (from.indexOf("\\app.js")>=0) {
            file = "const Wz = require('./utils/wzapi');\n" + file;
        }

        fs.writeFile(to, file, function (err) {
            if (err) throw err;
        });
    } else if (/\.wxss$/i.test(from)) {
        if (from == fromPathBase+'\\app.wxss') {
            const antdefault_css = fs.readFileSync(__dirname+'/antdefault.css', 'utf8');
            file = antdefault_css + file;
        }
        file = file.replace('.wxss"', '.acss"').replace('.wxss\'', '.acss\'');
        fs.writeFile(to, file, function (err) {
            if (err) throw err;
        });
    } else {
        //[cp]
        if (from == fromPathBase+"\\app.json") {
            for (var key in json_w2a) {
                file = file.replace(key, json_w2a[key]);
            }
            fs.writeFile(to, file, function (err) {
                if (err) throw err;
            });
            return;
        }
        shelljs.cp(from, to);
    }
}
module.exports = {
    to: to 
}