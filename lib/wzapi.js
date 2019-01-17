/*微信小程序 支付宝小程序 api兼容库
以微信小程序api调用方式为主 支付宝作兼容   

diff-wx:
    wx.showLoading wx.showToast mask:must(true)
    wx.getUserInfo withCredentials:(false) userinfo:only(nickName,avatar)
    wx.showActionSheet itemColor:no
    wx.showModal color:no showCancel:no res.cancel:no
    wx.setNavigationBarColor only:backgroundColor
    wx.setTabBar wx.setTopBarText no
    wx.pageScrollTo duration: 300
    wx.startPullDownRefresh no
    wx.uploadFile uploadTask no
    wx.downloadFile downloadTask no res.statusCode no
    wx.getSavedFileList res.errMsg no
    wx.openDocument no
    wx.getLocation altitude no type no res.verticalAccuracy no res.altitude no res.speed no
    wx.createMapContext no
    wx.chooseImage sizeType no res.tempFiles no
    wx.getImageInfo res.orientation no res.type no
    wx.getSystemInfo statusBarHeight no
    wx.scanCode onlyFromCamera:must(false)  scanType:only(qrCode,barCode) res.charSet no res.path no
    wx.getBluetoothAdapterState wx.stopBluetoothDevicesDiscovery wx.getBluetoothDevices wx.getConnectedBluetoothDevices wx.createBLEConnection wx.closeBLEConnection wx.getBLEDeviceServices wx.getBLEDeviceCharacteristics wx.readBLECharacteristicValue(res.errCode) wx.writeBLECharacteristicValue wx.setKeepScreenOn res.errMsg no
    wx.getBluetoothDevices wx.onBluetoothDeviceFound {device}: serviceData no advertisServiceUUIDs no 
    wx.addPhoneContact no
    iBeacon no
    NFC no
    Wi-Fi no
    
diff-my
    canvas notest
    selectorQuery notest
    socket notest
*/
let wz = {};
let run_platform = '';  //Weixin Alipay

function isWeixin() {
	try {
		wx.canIUse('openBluetoothAdapter');
        return true;
	} catch (e) {
        return false;
	}
}

//辅助函数
function toLowerKey(obj) {
    for (let key in obj) {
        let lowerkey = key.toLowerCase();
        if (key != lowerkey) {
            obj[lowerkey] = obj[key];
            delete obj[key];
        }
    }
    return obj;
}
function changeObjsKey(objs,oldkey,newkey) {
    objs.forEach((it)=>{
        it[newkey] = it[oldkey];
        delete it[oldkey];
    });
    return objs;
}
function str2bool(str) {
    if (str === 'true') return true;
    if (str === 'false') return false;
}
function getFileType(filepath) {
    let image_suffix = [".png",".jpg",".jpeg",".bmp",".gif"];
    let video_suffix = ['.rmvb','.flv','.wmv','.avi','.mp4','.mkv'];
    let audio_suffix = ['.ogg','.wav','.mp3','.ape','.aac'];
    let suffix = filepath.substr(filepath.lastIndexOf('.')).toLowerCase();

    if (image_suffix.includes(suffix)) {
        return 'image';
    }else if(video_suffix.includes(suffix)){
        return 'video';
    }else if(audio_suffix.includes(suffix)){
        return 'audio';
    }else {
        console.error('未知文件类型：'+suffix)
    }
}

//Tool.js方法 减少依赖
const Tool = {
    nullEvent() {},
    buf2shex(buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), x => ("00" + x.toString(16)).slice(-2)).join('');
    },
    shex2buf(shex) {
        let ahex = shex.match(/[\da-f]{2}/gi);
        let typedArray = new Uint8Array(ahex.map(h=>parseInt(h, 16)));
        return typedArray.buffer;
    }
}

//队列式任务管理 如果不能保证发生回调，会发生阻塞
let queueMg = {
    queue: [],
    queueCb: [],
    is_run: false,
    push(func,completeCb) {
        let self = this;
        let completeCb_warp = function() {
            completeCb&&completeCb();
            self.is_run = false;
            if (self.queue.length >= 1) {
                let qfunc = self.queue.shift();
                let qargu = self.queueCb.shift();
                self.is_run = true;
                qfunc(qargu);
            }
        }
        if (!self.is_run) {
            self.is_run = true;
            func(completeCb_warp);
        }else {
            self.queue.push(func);
            self.queueCb.push(completeCb_warp);
        }
    },
    clear() {
        let self = this;
        self.queue = [];
        self.queueCb = [];
        self.is_run = false;
    }
}

let override_wx = {
    showLoading(obj) {
        obj.mask = true;
        wx.showLoading(obj);
    },
    showToast(obj) {
        obj.mask = true;
        wx.showToast(obj);
    },
}
let override_my_global = {
    is_startAccelerometer: false,
    is_startCompass: false,
    openBtAd_clone: null
}
let override_my = {
    //网络
    request(obj) {
        obj = obj||{};

        obj.header = obj.header||{};
        obj.header = toLowerKey(obj.header);
        obj.header['content-type'] = obj.header['content-type']||'application/json';
        obj.headers = obj.header;
        delete obj.header;

        obj.data = obj.data||{};
        if (obj.headers['content-type'] == 'application/json')
            obj.data = JSON.stringify(obj.data);

        let org_dataType = obj.dataType||'json';
        let org_success = obj.success||Tool.nullEvent;
        obj.dataType = 'text';
        obj.success = function(res) {
            res.header = res.headers;
            delete res.headers;
            if (res.header instanceof Array) {
                let header_tmp = res.header;
                res.header = {};
                header_tmp.map(function(item) {
                    res.header = Object.assign(res.header,item);
                })
            }
            if (!res.header.Date) {
                res.header.Date = res.header.date;
                delete res.header.date;
            }
            if (org_dataType == 'json'&&typeof res.data != 'object') {
                let startIdx = res.data.indexOf('{');
                if (startIdx >= 0)
                    res.data = JSON.parse(res.data.substr(startIdx));
                else 
                    res.data = res.data;//{};
            }
            org_success(res);
        }
        return my.httpRequest(obj);
    },
    //缓存
    setStorageSync(vkey, vdata) {
		return my.setStorageSync({ key: vkey, data: vdata });
	},
	getStorageSync(vkey) {
		return my.getStorageSync({ key: vkey }).data;
	},
    removeStorageSync(vkey) {
		return my.removeStorageSync({ key: vkey });
	},
    //界面
    showLoading(obj) {
        obj = obj||{};
		obj.content = obj.title;
        delete obj.title;
		my.showLoading(obj);
	},
    //获取数据
    getUserInfo(obj) {
        obj = obj||{};
        my.getAuthCode({
			scopes: 'auth_user',
			success: (res) => {
				my.getAuthUserInfo({
					success(userInfo){
                        userInfo.avatarUrl = userInfo.avatar;
                        delete userInfo.avatar;
                        obj.success&&obj.success({userInfo});
					},
                    fail(res) {
                        obj.fail&&obj.fail();
                    }
				});
			},
            fail: (res) => {
                obj.fail&&obj.fail();
            }
		});
	},
    login(obj) {
        obj = obj||{};
        let org_success = obj.success;
        obj.success = function(res) {
            res.code = res.authCode;
            delete res.authCode;
            org_success(res);
        }
        obj.scopes = 'auth_base';
        my.getAuthCode(obj);
    },
    //蓝牙
    openBluetoothAdapter (res) {
        let org_fail = res.fail;
        let org_complete = res.complete;
        let is_first = true;
        let is_fail = false;
        if (override_my_global.openBtAd_clone)
            clearTimeout(override_my_global.openBtAd_clone);

        res.complete = function(res1) {
            if (!is_fail) {
                org_complete&&org_complete(res1);
            }
        }
        res.fail = function(err) {
            is_fail = true;
            override_my_global.openBtAd_clone = setTimeout(function() {
                is_fail = false;
		        my.openBluetoothAdapter({
                    success: res.success,
                    fail: res.fail,
                    complete: res.complete
                });
            },1000);
            if (is_first) {
                org_fail&&org_fail();
                is_first = false;
            }
        }
        my.openBluetoothAdapter({
            autoClose: false,
            success: res.success,
            fail: res.fail,
            complete: res.complete
        });
	},
    onBluetoothAdapterStateChange(eventcb) {
        eventcb = eventcb||Tool.nullEvent;
        my.offBluetoothAdapterStateChange();
        let warp_eventcb = function(res) { 
            if (typeof res.available === "string") res.available = str2bool(res.available);
            if (typeof res.discovering === "string") res.discovering = str2bool(res.discovering);
            eventcb(res);
        }
		my.onBluetoothAdapterStateChange(warp_eventcb);
	},
    onBluetoothDeviceFound(eventcb) {
        eventcb = eventcb||Tool.nullEvent;
        my.offBluetoothDeviceFound();
		my.onBluetoothDeviceFound(eventcb);
	},
    onBLEConnectionStateChange(eventcb) {
        eventcb = eventcb||Tool.nullEvent;
        my.offBLEConnectionStateChanged();
		my.onBLEConnectionStateChanged(eventcb);
	},
    onBLECharacteristicValueChange(eventcb) {
        eventcb = eventcb||Tool.nullEvent;
        my.offBLECharacteristicValueChange();
		my.onBLECharacteristicValueChange(function(res) {
            res.value = Tool.shex2buf(res.value);
            eventcb(res);
        });
	},
    writeBLECharacteristicValue(obj){
        obj = obj||{};
        obj.value = Tool.buf2shex(obj.value);
        obj.complete = obj.complete||Tool.nullEvent;
        queueMg.push(function(complete) {
            obj.complete = complete;
            my.writeBLECharacteristicValue(obj);
        },obj.complete);
    },
    createBLEConnection(obj) {
        obj = obj||{};
        my.connectBLEDevice(obj);
    },
    closeBLEConnection(obj) {
        obj = obj||{};
        my.disconnectBLEDevice(obj);
    },
    getBLEDeviceServices(obj) {
        obj = obj||{};
        let org_success = obj.success;
        obj.success = function(res) {
            res.services = changeObjsKey(res.services,'serviceId','uuid');
            org_success(res);
        }
        my.getBLEDeviceServices(obj);
	},
    getBLEDeviceCharacteristics(obj) {
        obj = obj||{};
		let org_success = obj.success;
        obj.success = function(res) {
            res.characteristics = changeObjsKey(res.characteristics,'characteristicId','uuid');
            org_success(res);
        }
		my.getBLEDeviceCharacteristics(obj);
	},


    //其他兼容
    uploadFile(obj) {
        obj = obj||{};
        obj.fileName = obj.name;
        delete obj.name;
        obj.fileType = getFileType(obj.filePath);
        my.uploadFile(obj);
    },
    downloadFile(obj) {
        obj = obj||{};
        let org_success = obj.success;
        obj.success = function(res) {
            res.tempFilePath = res.apFilePath;
            delete res.apFilePath;
            org_success(res);
        }
        my.downloadFile(obj);
    },

    //文件
    saveFile(obj) {
        obj = obj||{};
        obj.apFilePath = obj.tempFilePath;
        delete obj.tempFilePath;
        
        let org_success = obj.success||Tool.nullEvent;
        obj.success = function(res) {
            res.savedFilePath = res.apFilePath;
            delete res.apFilePath;
            org_success(res)
        }
        my.saveFile(obj);
    },
    getSavedFileList(obj) {
        obj = obj||{};
        let org_success = obj.success||Tool.nullEvent;
        obj.success = function(res) {
            res.fileList = changeObjsKey(res.fileList,'apFilePath','filePath');
            org_success(res);
        }
        my.getSavedFileList(obj);
    },
    getSavedFileInfo(obj) {
        obj = obj||{};
        obj.apFilePath = obj.filePath;
        delete obj.title;
        my.getSavedFileInfo(obj);
    },
    removeSavedFile(obj) {
        obj = obj||{};
        obj.apFilePath = obj.filePath;
        delete obj.title;
        my.getSavedFileList(obj);
    },
    //位置
    getLocation(obj) {
        obj = obj||{};
        obj.type = 1;
        my.getLocation(obj);
    },
    //媒体
    chooseImage(obj) {
        obj = obj||{};
        let org_success = obj.success||Tool.nullEvent;
        obj.success = function(res){
            res.tempFilePaths = res.apFilePaths;
            delete res.apFilePaths;
            org_success(res);
        };
        my.chooseImage(obj);
    },
    saveImageToPhotosAlbum(obj) {
        obj = obj||{};
        obj.url = obj.filePath;
        delete obj.filePath;

        let org_success = obj.success||Tool.nullEvent;
        obj.success = function(res) {
            res.errMsg = res.error;
            org_success(res);
        }

        my.saveImage(obj);
    },
    //设备
    getSystemInfo(obj) {
        obj = obj||{};
        let org_success = obj.success||Tool.nullEvent;
        obj.success = function(res) {
            res.SDKVersion = my.SDKVersion;
            org_success(res);
        }
        my.getSystemInfo(obj);
    },
    getSystemInfoSync() {
        let res = my.getSystemInfoSync();
        res.SDKVersion = my.SDKVersion;
        return res;
    },
    onNetworkStatusChange(eventcb) {
        eventcb = eventcb||Tool.nullEvent;
        my.offNetworkStatusChange();
        let warp_eventcb = function(res) {
            if (res.networkType == "NOTREACHABLE") {
                res.networkType = 'none';
            }else if(res.networkType == "WWAN") {
                res.networkType = 'unknown';
            }
            res.networkType = res.networkType.toLowerCase();
            eventcb(res);
        }
    },
    onUserCaptureScreen(eventcb) {
        my.offUserCaptureScreen();
        my.onUserCaptureScreen(eventcb);
    },
    setScreenBrightness(obj) {
        obj = obj||{};
        obj.brightness = obj.value;
        delete obj.value;
        my.setScreenBrightness(obj)
    },
    getScreenBrightness(obj) {
        obj = obj||{};
        let org_success = obj.success||Tool.nullEvent;
        obj.success = function(res) {
            res.value = res.brightness;
            delete res.brightness;
            org_success(res);
        }
    },
    vibrateLong(obj) {
        obj = obj||{};
        my.vibrate(obj);
    },
    vibrateShort(obj) {
        obj = obj||{};
        my.vibrate(obj);
    },
    onAccelerometerChange(eventcb) {
        eventcb = eventcb||Tool.nullEvent;
        my.offAccelerometerChange();
        warp_eventcb = function(res) {
            if (!override_my_global.is_startAccelerometer) return;
            eventcb(res);
        }
        my.onAccelerometerChange(warp_eventcb);
    },
    startAccelerometer(obj) {
        obj = obj||{};
        setTimeout(function() {
            override_my_global.is_startAccelerometer = true;
            obj.success&&obj.success();
            // obj.fail&&obj.fail();
            obj.complete&&obj.complete();
        },0);
    },
    stopAccelerometer(obj) {
        obj = obj||{};
        my.offAccelerometerChange();
        setTimeout(function() {
            override_my_global.is_startAccelerometer = false;
            obj.success&&obj.success();
            // obj.fail&&obj.fail();
            obj.complete&&obj.complete();
        },0);
    },
    onCompassChange(eventcb) {
        eventcb = eventcb||Tool.nullEvent;
        my.offCompassChange();
        warp_eventcb = function(res) {
            if (!override_my_global.is_startCompass) return;
            eventcb(res);
        }
        my.onCompassChange(warp_eventcb);
    },
    startCompass(obj) {
        obj = obj||{};
        setTimeout(function() {
            override_my_global.is_startCompass = true;
            obj.success&&obj.success();
            // obj.fail&&obj.fail();
            obj.complete&&obj.complete();
        },0);
    },
    stopCompass(obj) {
        obj = obj||{};
        my.offCompassChange();
        setTimeout(function() {
            override_my_global.is_startCompass = false;
            obj.success&&obj.success();
            // obj.fail&&obj.fail();
            obj.complete&&obj.complete();
        },0);
    },
    makePhoneCall(obj) {
        obj = obj||{};
        obj.number = obj.phoneNumber;
        setTimeout(function() {
            my.makePhoneCall(obj);
            obj.success&&obj.success();
            // obj.fail&&obj.fail();
            obj.complete&&obj.complete();
        },0);
    },
    scanCode(obj) {
        obj = obj||{};
        if (obj.scanType instanceof Array) {
            obj.scanType = obj.scanType[0];
        }
        obj.scanType = obj.scanType||'qrCode';
        if (obj.scanType == 'qrCode') {
            obj.type = 'qr';
        }else if(obj.scanType == 'barCode') {
            obj.type = 'bar';
        }else {
            obj.type = 'qr';
        }
        delete obj.scanType;

        let org_success = obj.success||Tool.nullEvent;
        obj.success = function(res) {
            res.result = res.code;
            delete res.code;
            if (res.qrCode) {
                res.scanType = 'QR_CODE';
                delete res.qrCode;
            }else if (res.barCode){
                res.scanType = 'CODABAR';
                delete res.barCode;
            }
            org_success(res);
        }
        my.scan(obj);
    },
    setClipboardData(obj) {
        obj = obj||{};
        obj.text = obj.data;
        delete obj.data;
        my.setClipboard(obj);
    },
    getClipboardData(obj) {
        obj = obj||{};
        let org_success = obj.success||Tool.nullEvent;
        obj.success = function(res) {
             res.data = res.text;
             delete res.text;
            org_success(res);
        }
        my.getClipboard(obj);
    },
    //蓝牙
    getBluetoothDevices(obj) {
        obj = obj||{};
        let org_success = obj.success||Tool.nullEvent;
        obj.success = function(res) {
            res.devices.forEach(function(device) {
                // device.advertisData = Tool.shex2buf(device.advertisData);
            });
            org_success(res);
        }
        my.getBluetoothDevices(obj);
    },
    

    //界面
    showToast(obj) {
        obj = obj||{};
        obj.content = obj.title;
        delete obj.title;
        obj.type = obj.icon;
        delete obj.icon;
        my.hideLoading();
        my.showToast(obj);
    },
    showModal(obj) {
        obj = obj||{};

        obj.confirmText = obj.confirmText||'确定';
        obj.cancelText = obj.cancelText||'取消';
        if (!obj.hasOwnProperty('showCancel'))
            obj.showCancel = true;
        
        let org_success = obj.success||Tool.nullEvent;
        if (obj.showCancel) {
            //my.confirm
            obj.confirmButtonText = obj.confirmText;
            delete obj.confirmText;
            obj.cancelButtonText = obj.cancelText;
            delete obj.cancelText; 
            obj.success = function(res) {
                res.cancel = !res.confirm;
                org_success(res);
            }
            my.confirm(obj);
        }else {
            //my.alert
            obj.buttonText = obj.confirmText;
            delete obj.confirmText;
            obj.success = function(res) {
                res.confirm = true;
                res.confirm = !res.confirm;
                org_success(res);
            }
            my.alert(obj);
        }
    },
    showActionSheet(obj) {
        obj = obj||{};
        obj.items = obj.itemList;
        delete obj.itemList;
        
        let org_success = obj.success||Tool.nullEvent;
        obj.success = function(res) {
            res.tapIndex = res.index;
            delete res.index;
            org_success(res)
        }
        my.showActionSheet(obj);
    },
    setNavigationBarTitle(obj) {
        obj = obj||{};
        my.setNavigationBar(obj);
    },
    setNavigationBarColor(obj) {
        obj = obj||{};
        my.setNavigationBar(obj);
    }
}

if (isWeixin()) {
    run_platform = 'Weixin';
    wz = Object.assign({},wx,override_wx);
}else {
    run_platform = 'Alipay';
    wz = Object.assign({},my,override_my);
}
wz.getRunPlatform = function() {
    return run_platform;
}


module.exports = wz;