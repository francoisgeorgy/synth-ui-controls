// const webpack = require("webpack");
const path = require('path');

module.exports = {
    entry: [
        './src/envelope.js',
        './src/knob.js'
    ],
    // plugins: [
    //     new webpack.ProvidePlugin({
    //         $: "jquery",
    //         jQuery: "jquery",
    //         "window.jQuery": "jquery'",
    //         "window.$": "jquery"
    //     }),
    // ],
    output: {
        filename: './synth-ui-controls.js',
        path: path.resolve(__dirname, 'dist')
    }
};
