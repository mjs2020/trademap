/* eslint import/no-extraneous-dependencies: 0 */
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const precss = require('precss');
const autoprefixer = require('autoprefixer');
const webpack = require('webpack');
const packageJson = require('./package.json');
const child = require('child_process');

let commitHash = 'Unknown commit';
try {
  commitHash = child.execSync('git rev-parse HEAD').toString();
} catch (err) {
  console.log(`Could not get commit hash. Got error: ${err}`);
}

const commitLink = `${packageJson.homepage}/commit/${commitHash}`;

const project = (process.env.PROJECT || 'nisra').trim();

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
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
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
                plugins() {
                  return [precss, autoprefixer];
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
              name: '[path][name].[ext]',
              context: `src/${project}`
            },
          },
          {
            loader: 'extract-loader',
          },
          {
            loader: 'html-loader',
            options: {
              attrs: ['img:src'],
              minimize: true,
              removeComments: true,
              collapseWhitespace: true
            },
          },
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'assets/[name].[ext]'
            }
          }
        ]
      },
      {
        test: /\.(ico)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]'
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'assets/[name].[ext]'
            }
          }
        ]
      },
      {
        test: /\.modernizrrc.js$/,
        use: ['modernizr-loader']
      },
      {
        test: /\.modernizrrc(\.json)?$/,
        use: ['modernizr-loader', 'json-loader']
      }
    ]
  },
  resolve: {
    alias: {
      modernizr$: path.resolve(__dirname, '.modernizrrc')
    }
  },
  plugins: [
    new ExtractTextPlugin('styles.css'),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    }),
    new webpack.DefinePlugin({
      __PROJECT__: JSON.stringify(project),
      __VERSION__: JSON.stringify(packageJson.version),
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __COMMIT_LINK__: JSON.stringify(commitLink)
    })
  ]
};
