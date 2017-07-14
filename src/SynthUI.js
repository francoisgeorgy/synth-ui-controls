
    "use strict";

    (function(root, factory) {
        console.log('inside function(root, factory)');                  // (1)
        if (typeof define === "function" && define.amd) {
            define(factory);
        } else if (typeof module === "object" && module.exports) {
            module.exports = factory();
        } else {
            console.group("factory");
            console.log('before root.myModule = factory()', root);                   // (2)
            root.SynthUI = factory();  // attach myModule to global space (e.g. window)
            console.log('after root.myModule = factory()');
            console.groupEnd();
        }
    }(this, function() {

        function _getOS() {
            var userAgent = window.navigator.userAgent,
                platform = window.navigator.platform,
                macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
                windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
                iosPlatforms = ['iPhone', 'iPad', 'iPod'],
                os = null;
            if (macosPlatforms.indexOf(platform) !== -1) {
                os = 'Mac OS';
            } else if (iosPlatforms.indexOf(platform) !== -1) {
                os = 'iOS';
            } else if (windowsPlatforms.indexOf(platform) !== -1) {
                os = 'Windows';
            } else if (/Android/.test(userAgent)) {
                os = 'Android';
            } else if (!os && /Linux/.test(platform)) {
                os = 'Linux';
            }
            return os;
        }

        var dummy = 123;

        var knob = function(config){
            console.log('knob', config, this);
            var value = config;
            var getValue = function() {
                return value;
            };
            var setValue = function(v) {
                value = v;
            };
            var t = function() {
                console.log(this);
            };
            return {
                value: getValue,
                setValue: setValue,
                t: t
            };
        };

        return {
            knob: knob
        };
    }));
