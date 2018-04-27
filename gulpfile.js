/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global __dirname, require */

const gulp = require('gulp');
const gutil = require('gulp-util');
const gulpif = require('gulp-if');
const sass = require('gulp-sass');
const less = require('gulp-less');
const del = require('del');
const karma = require('karma');
const eslint = require('gulp-eslint');
const watch = require('gulp-watch');
const gulpStylelint = require('gulp-stylelint');
const argv = require('yargs').argv;
const browserSync = require('browser-sync');
const mediaEntrypoints = require('./media-entrypoints.json');

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

var handleError = function (task) {
    return function (err) {
        gutil.log(gutil.colors.bgRed(task + ' error:'), gutil.colors.red(err));
    };
};

gulp.task('media:watch', () => {
    return watch(['media/**/*', '!media/css/**/*'], {base: 'media', verbose: true})
        .pipe(gulp.dest('static_build'));
});

gulp.task('sass', function() {
    return gulp.src(mediaEntrypoints.sass, {base: 'media'})
        .pipe(sass({
            sourceComments: !production,
            outputStyle: production ? 'compressed' : 'nested'
        }).on('error', handleError('SASS')))
        .pipe(gulp.dest('static_build'));
});

gulp.task('less', function() {
    return gulp.src(mediaEntrypoints.less, {base: 'media'})
        .pipe(less().on('error', handleError('LESS')))
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

gulp.task('static:clean', () => {
    return del(['static_build']);
});

gulp.task('assets', () => {
    return gulp.src(['media/**/*', '!media/css/**/*'], {base: 'media'})
        .pipe(gulp.dest('static_build'));
});

gulp.task('browser-sync', () => {
    browserSync({proxy: 'localhost:8000'});
});

gulp.task('reload-sass', ['sass'], browserSync.reload);
gulp.task('reload-less', ['less'], browserSync.reload);
gulp.task('reload-js', ['assets'], browserSync.reload);
gulp.task('reload', browserSync.reload);

// --------------------------
// DEV/WATCH TASK
// --------------------------
gulp.task('watch', ['assets', 'sass', 'less', 'browser-sync'], function () {
    gulp.start('media:watch');

    // --------------------------
    // watch:less
    // --------------------------
    gulp.watch('media/css/**/*.less', ['less']);

    // --------------------------
    // watch:sass
    // --------------------------
    gulp.watch('media/css/**/*.scss', ['sass']);

    // --------------------------
    // watch:css
    // --------------------------
    gulp.watch('static_build/css/**/*.css', ['css:lint', 'reload']);

    // --------------------------
    // watch:js
    // --------------------------
    gulp.watch('static_build/js/**/*.js', ['js:lint', 'reload-js']);

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

gulp.task('build', ['assets', 'sass']);

gulp.task('default', ['watch']);
