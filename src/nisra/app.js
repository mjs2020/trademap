/* eslint import/no-webpack-loader-syntax: 0 */
/* eslint import/no-extraneous-dependencies: 0 */
/* eslint import/first: 0 */
/* eslint import/no-unresolved: 0 */
/* eslint no-undef: 0 */

// html
import './index.html';
import './pages/about.html';
import './pages/contacts.html';
import './pages/cookie_policy.html';
import './pages/furtherinfo.html';
import './pages/licence.html';

// txt & csv
import 'file-loader?name=[name].[ext]!./robots.txt';
import 'file-loader?name=[name].[ext]!./humans.txt';

// img
import './favicon.ico';

// sass & css
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/css/bootstrap-theme.css';
import 'intro.js/introjs.css';
import 'select2/dist/css/select2.css';
import 'select2-bootstrap-theme/dist/select2-bootstrap.css';
import './sass/main.scss';

// javascript libs
import $ from 'jquery';
import 'bootstrap';

// javascript app
import main from './lib/main';

// version
console.log(`${__PROJECT__} trademap: version ${__VERSION__} commit: ${__COMMIT_LINK__}`);

$(document).ready(() => main());
