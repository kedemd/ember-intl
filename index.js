/* jshint node: true */

/**
 * Copyright 2015, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */

'use strict';

var serialize    = require('serialize-javascript');
var mergeTrees   = require('broccoli-merge-trees');
var Funnel       = require('broccoli-funnel');
var walkSync     = require('walk-sync');
var path         = require('path');
var fs           = require('fs');

var LocaleWriter = require('./lib/broccoli-cldr');

var relativeFormatPath = path.dirname(require.resolve('intl-relativeformat'));
var messageFormatPath  = path.dirname(require.resolve('intl-messageformat'));
var intlPath           = path.dirname(require.resolve('intl'));

module.exports = {
    name: 'ember-intl',

    included: function (app) {
        this.app = app;
        var vendorPath = this.treePaths.vendor;
        app.import(vendorPath + '/messageformat/intl-messageformat.js');
        app.import(vendorPath + '/relativeformat/intl-relativeformat.js');
    },

    treeForApp: function (inputTree) {
        var appPath = this.treePaths.app;
        var localesPath = path.join(this.project.root, appPath, 'locales');
        var trees = [inputTree];

        if (fs.existsSync(localesPath)) {
            var locales = walkSync(localesPath).map(function (filename) {
                return path.basename(filename, path.extname(filename));
            }).filter(LocaleWriter.has);

            var localeTree = new LocaleWriter(inputTree, 'cldrs', {
                locales:        locales,
                pluralRules:    true,
                relativeFields: true,
                prelude:        '/*jslint eqeq: true*/\n',
                wrapEntry:      this._transformLocale
            });

            trees.push(localeTree)
        }

        return mergeTrees(trees, { overwrite: true });
    },

    treeForVendor: function (inputTree) {
        var trees = [];

        if (inputTree) {
            trees.push(inputTree);
        }

        trees.push(new Funnel(this.treeGenerator(messageFormatPath), {
            srcDir:  '/dist',
            destDir: 'messageformat'
        }));

        trees.push(new Funnel(this.treeGenerator(relativeFormatPath), {
            srcDir:  '/dist',
            destDir: 'relativeformat'
        }));

        return mergeTrees(trees);
    },

    treeForPublic: function (inputTree) {
        var config = this.project.config(this.app.env);
        var trees  = [inputTree];

        trees.push(new Funnel(intlPath, {
            srcDir:  '/',
            files:   ['Intl.complete.js', 'Intl.js', 'Intl.min.js'],
            destDir: '/assets/intl/polyfill/'
        }));

        // only use these when using Intl.js, should not be used
        // with the native Intl API
        trees.push(new Funnel(intlPath + '/locale-data/jsonp', {
            srcDir:  '/',
            files:   ['*.js'],
            destDir: '/assets/intl/polyfill/locales/'
        }));

        return mergeTrees(trees, { overwrite: true });
    },

    _transformLocale: function (result) {
        return 'export default ' + serialize(result)+ ';';
    }
};
