const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const project = (process.env.project || 'nisra').trim();

module.exports = {
  entry: path.resolve(__dirname, 'src', project, 'app.js'),
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist', project)
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(scss)$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                minimize: true,
                sourceMap: true
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: true,
                plugins: function () {
                  return [
                    require('precss'),
                    require('autoprefixer')
                  ];
                }
              }
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true
              }
            }
          ]
        })
      },
      {
        test: /\.html$/,
        use: [
          {
              loader: 'file-loader',
              options: {
                  name: "[name].[ext]",
              },
          },
          {
              loader: "extract-loader",
          },
          {
              loader: "html-loader",
              options: {
                  attrs: ["img:src"],
                  minimize: true,
                  removeComments: true,
                  collapseWhitespace: true
              },
          },
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              useRelativePath: true
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          'file-loader'
        ]
      },
      {
        test: /\.modernizrrc.js$/,
        use: [ 'modernizr-loader' ]
      },
      {
        test: /\.modernizrrc(\.json)?$/,
        use: [ 'modernizr-loader', 'json-loader' ]
      }
    ]
  },
  resolve: {
    alias: {
      modernizr$: path.resolve(__dirname, ".modernizrrc")
    }
  },
  plugins: [
    new ExtractTextPlugin('styles.css')
  ]
};
