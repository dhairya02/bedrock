/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global __dirname, require */

const gulp = require('gulp');
const gutil = require('gulp-util');
const gulpif = require('gulp-if');
const sass = require('gulp-sass');
const less = require('gulp-less');
const cleanCSS = require('gulp-clean-css');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const del = require('del');
const karma = require('karma');
const eslint = require('gulp-eslint');
const watch = require('gulp-watch');
const gulpStylelint = require('gulp-stylelint');
const argv = require('yargs').argv;
const browserSync = require('browser-sync');
const merge = require('merge-stream');
const staticBundles = require('./static-bundles.json');

const lintPathsJS = [
    'media/js/**/*.js',
    '!media/js/libs/*.js',
    'tests/unit/spec/**/*.js',
    'gulpfile.js'
];

const lintPathsCSS = [
    'media/css/**/*.scss',
    'media/css/**/*.less',
    'media/css/**/*.css',
    '!media/css/libs/*'
];

// gulp build --production
var production = !!argv.production;
// determine if we're doing a build
// and if so, bypass the livereload
var build = argv._.length ? argv._[0] === 'build' : false;

var allBundleFiles = function (fileType, fileExt) {
    let allFiles = [];
    staticBundles[fileType].forEach(function(bundle){
        bundle.files.forEach(function(bFile){
            if (bFile.endsWith(fileExt)) {
                allFiles.push(bFile);
            }
        });
    });
    return allFiles;
};

var allLess = function (file) {
    return file.path.endsWith('.less');
};

var handleError = function (task) {
    return function (err) {
        gutil.log(gutil.colors.bgRed(task + ' error:'), gutil.colors.red(err));
    };
};

gulp.task('media:watch', () => {
    return watch(['media/**/*', '!media/css/**/*.{scss,less}'], {base: 'media', verbose: true})
        .pipe(gulp.dest('static_build'));
});

gulp.task('css:compile', ['sass', 'less'], function() {
    return merge(staticBundles.css.map(function(bundle){
        var bundleFilename = `css/BUNDLES/${bundle.name}.css`;
        var cssFiles = bundle.files.map(function(fileName){
            if (!fileName.endsWith('.css')) {
                return fileName.replace(/\.(less|scss)$/i, '.css');
            }
            return fileName;
        });
        return gulp.src(cssFiles, {base: 'static_build', 'cwd': 'static_build'})
            .pipe(gulpif(!production, sourcemaps.init()))
            .pipe(concat(bundleFilename))
            // we don't serve the source files
            // so include scss content inside the sourcemaps
            .pipe(gulpif(!production, sourcemaps.write({
                'includeContent': true
            })))
            .pipe(gulp.dest('static_build'));
    }));
});

gulp.task('js:compile', function() {
    return merge(staticBundles.js.map(function(bundle){
        var bundleFilename = `js/BUNDLES/${bundle.name}.js`;
        return gulp.src(bundle.files, {base: 'media', 'cwd': 'media'})
            .pipe(gulpif(!production, sourcemaps.init()))
            .pipe(concat(bundleFilename))
            .pipe(gulpif(!production, sourcemaps.write({
                'includeContent': true
            })))
            .pipe(gulp.dest('static_build'));
    }));
});

gulp.task('sass', function() {
    return gulp.src(allBundleFiles('css', '.scss'), {base: 'media', cwd: 'media'})
        .pipe(gulpif(!production, sourcemaps.init()))
        .pipe(sass({
            sourceComments: !production,
            outputStyle: production ? 'compressed' : 'nested'
        }).on('error', handleError('SASS')))
        // we don't serve the source files
        // so include scss content inside the sourcemaps
        .pipe(gulpif(!production, sourcemaps.write({
            'includeContent': true
        })))
        .pipe(gulp.dest('static_build'));
});

gulp.task('less', function() {
    return gulp.src(allBundleFiles('css', '.less'), {base: 'media', cwd: 'media'})
        .pipe(gulpif(!production, sourcemaps.init()))
        .pipe(less({inlineJavaScript: true, ieCompat: true}).on('error', handleError('LESS')))
        // we don't serve the source files
        // so include scss content inside the sourcemaps
        .pipe(gulpif(!production, sourcemaps.write({
            'includeContent': true
        })))
        .pipe(gulp.dest('static_build'));
});

gulp.task('css:minify', ['css:compile'], () => {
    return gulp.src('static_build/css/**/*.css', {base: 'static_build'})
        .pipe(cleanCSS().on('error', handleError('CLEANCSS')))
        .pipe(gulp.dest('static_build'));
});

gulp.task('js:minify', ['js:compile'], () => {
    return gulp.src('static_build/js/**/*.js', {base: 'static_build'})
        .pipe(uglify().on('error', handleError('UGLIFY')))
        .pipe(gulp.dest('static_build'));
});

gulp.task('js:test', done => {
    new karma.Server({
        configFile: `${__dirname}/tests/unit/karma.conf.js`,
        singleRun: true
    }, done).start();
});

gulp.task('js:lint', () => {
    return gulp.src(lintPathsJS)
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});


gulp.task('css:lint', () => {
    return gulp.src(lintPathsCSS)
        .pipe(gulpStylelint({
            reporters: [{
                formatter: 'string',
                console: true
            }]
        }));
});

gulp.task('clean', () => {
    return del(['static_build']);
});

gulp.task('assets', () => {
    return gulp.src([
        'media/**/*',
        '!media/css/**/*.{scss,less}',
        '!media/js/**/*.js'
    ], {base: 'media'}).pipe(gulp.dest('static_build'));
});

gulp.task('browser-sync', () => {
    var proxyURL = process.env.BS_PROXY_URL || 'localhost:8000';
    var openBrowser = !(process.env.BS_OPEN_BROWSER === 'false');
    browserSync({
        proxy: proxyURL,
        open: openBrowser,
        serveStatic: [{
            route: '/media',
            dir: 'static_build'
        }]
    });
});

gulp.task('reload-css', ['css:compile'], browserSync.reload);
gulp.task('reload-js', ['js:compile'], browserSync.reload);
gulp.task('reload', browserSync.reload);

// --------------------------
// DEV/WATCH TASK
// --------------------------
gulp.task('watch', ['assets', 'js:compile', 'css:compile', 'browser-sync'], function () {
    gulp.start('media:watch');

    // --------------------------
    // watch:less
    // --------------------------
    gulp.watch('media/css/**/*.less', ['css:compile']);

    // --------------------------
    // watch:sass
    // --------------------------
    gulp.watch('media/css/**/*.scss', ['css:compile']);

    // --------------------------
    // watch:js
    // --------------------------
    gulp.watch('media/js/**/*.js', ['js:lint', 'reload-js']);

    // --------------------------
    // watch:css
    // --------------------------
    gulp.watch('static_build/css/**/*.css', ['css:lint', 'reload']);

    // --------------------------
    // watch:html
    // --------------------------
    gulp.watch('bedrock/*/templates/**/*.html', ['reload']);

    // --------------------------
    // watch:python
    // --------------------------
    gulp.watch('bedrock/**/*.py', ['reload']);

    gutil.log(gutil.colors.bgGreen('Watching for changes...'));
});

gulp.task('build', ['assets', 'js:minify', 'css:minify']);

gulp.task('default', ['watch']);
