const parse5 = require('parse5');
const eventMap = require('./config/eventMap.js');

function genAst (ast) {
    let {childNodes, attrs, content = {}, tagName} = ast;

    //[cp]
    if (tagName == 'picker') {
        let modeidx = attrs.findIndex(function(item) {
            if (item.name == 'mode' && item.value == 'date') {
                return true;
            }
        });
        if (modeidx >= 0) {
            ast.attrs.splice(modeidx,1);
            ast.tagName = 'view';
            attrs = ast.attrs;
            tagName = ast.tagName;
            ast.attrs = attrs.map(item => {
                let {name, value} = item;
                switch (name) {
                    case 'value': {
                        value = value.slice(2,-2);
                        name = 'data-'+name;
                        break;
                    }
                    case 'fields': {
                        name = 'data-'+name;
                        break;
                    }
                    case 'bindchange': {
                        name = 'data-'+name;
                        break;
                    }
                }
                return {name,value};
            })
            ast.attrs.push({
                name: "onTap",
                value: "tapDatePicker"
            })
            attrs = ast.attrs;
        }
    }

    if (attrs) {
        ast.attrs = attrs.map(item => {
            let {name, value} = item;
            if((tagName === 'include' || tagName === 'import') && name === 'src') {
                value = value.replace(/\.wxml$/i, '.axml');
                value = value[0] === '.' ? value : './' + value;
            }
            //[cp]
            if (name == 'hidden' && value == '') {
                value = "{{true}}";
            }
            name = name.replace(/^catch(.*)/, (rep, $1) => {
                return `catch${$1[0].toUpperCase()}${$1.slice(1)}`;
            })
            // name = name.replace('bindscrolltolower','onScrollToLower');
            if (!!eventMap[name]) {
            	name = eventMap[name];
            }

            return {
            name: name.replace(/^wx\:/, 'a:').replace(/^bind(.*)/, (rep, $1) => {
                return `on${$1[0].toUpperCase()}${$1.slice(1)}`;
            }),
                value
            };
        })
    }
    //[cp]
    if (tagName == 'textarea') {
        ast.attrs.push({
            name: "show-count",
            value: "{{false}}"
        })
    }

    if (childNodes) {
        ast.childNodes = childNodes.map(item => {
            return genAst(item);
        })
    }
    if (content.childNodes) {
        ast.content.childNodes = content.childNodes.map(item => {
            return genAst(item);
        })
    }
    ast.tagName = ast.tagName === 'img' ? 'image': ast.tagName
    return ast;
}

function compiler (html) {
    const document = parse5.parseFragment(html);
    genAst(document)
    // console.log(document)
    
    const axml = parse5.serialize(document);
    return unescapeHTML(axml);
}

function unescapeHTML (a) {
    a = "" + a;  
    return a.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'");  
}

module.exports = {
    compiler: compiler
}