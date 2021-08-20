const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');


const config = {
	mode: 'development',
    entry:  __dirname + '/js/index.js',
    output: {
        path: __dirname + '/dist',
        filename: 'bundle.js',
    },
    module: {
	  rules: [
	    {
	      test: /\.js?$/,
	      exclude: /(node_modules|bower_components)/,
	      use: {
	        loader: 'babel-loader',
	        options: {
	          presets: ['@babel/preset-env']
	        }
	      }
	    },
        {
          test: /\.scss$/i,
          use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
        },
	  ]
	},
    resolve: {
        extensions: ['.js', '.css']
    },
     stats: {
         colors: true
     },
     devtool: 'inline-source-map',
     devServer: {
     	contentBase: './dist',
     	hot: true
     },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: __dirname + '/index.html'
        }),
        new MiniCssExtractPlugin(),
		new webpack.HotModuleReplacementPlugin()
    ],
};
module.exports = config;