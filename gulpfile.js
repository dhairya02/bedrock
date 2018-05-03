/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global __dirname, require, process */

const gulp = require('gulp');
const log = require('fancy-log');
const colors = require('ansi-colors');
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
const production = !!argv.production;

const allBundleFiles = (fileType, fileExt) => {
    let allFiles = [];
    staticBundles[fileType].forEach(bundle => {
        bundle.files.forEach(bFile => {
            if (bFile.endsWith(fileExt)) {
                allFiles.push(bFile);
            }
        });
    });
    return allFiles;
};

const handleError = task => {
    return err => {
        log.warn(colors.bold(colors.red(`[ERROR] ${task}:`)), colors.red(err));
    };
};

gulp.task('media:watch', () => {
    return watch(['media/**/*', '!media/css/**/*.{scss,less}'], {base: 'media', verbose: true})
        .pipe(gulp.dest('static_build'));
});

gulp.task('css:compile', ['sass', 'less'], () => {
    return merge(staticBundles.css.map(bundle => {
        let bundleFilename = `css/BUNDLES/${bundle.name}.css`;
        let cssFiles = bundle.files.map(fileName => {
            if (!fileName.endsWith('.css')) {
                return fileName.replace(/\.(less|scss)$/i, '.css');
            }
            return fileName;
        });
        return gulp.src(cssFiles, {base: 'static_build', 'cwd': 'static_build'})
            .pipe(concat(bundleFilename))
            .pipe(gulp.dest('static_build'));
    }));
});

gulp.task('js:compile', ['assets'], () => {
    return merge(staticBundles.js.map(bundle => {
        let bundleFilename = `js/BUNDLES/${bundle.name}.js`;
        return gulp.src(bundle.files, {base: 'static_build', cwd: 'static_build'})
            .pipe(gulpif(!production, sourcemaps.init()))
            .pipe(concat(bundleFilename))
            .pipe(gulpif(!production, sourcemaps.write({
                'includeContent': false
            })))
            .pipe(gulp.dest('static_build'));
    }));
});

gulp.task('sass', ['assets'], () => {
    return gulp.src(allBundleFiles('css', '.scss'), {base: 'static_build', cwd: 'static_build'})
        .pipe(gulpif(!production, sourcemaps.init()))
        .pipe(sass({
            sourceComments: !production,
            outputStyle: production ? 'compressed' : 'nested'
        }).on('error', handleError('SASS')))
        // we don't serve the source files
        // so include scss content inside the sourcemaps
        .pipe(gulpif(!production, sourcemaps.write({
            'includeContent': false
        })))
        .pipe(gulp.dest('static_build'));
});

gulp.task('less', ['assets'], () => {
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
        'node_modules/@mozilla-protocol/core/**/*',
        '!node_modules/@mozilla-protocol/core/*'
    ]).pipe(gulp.dest('static_build'));
});

gulp.task('browser-sync', ['js:compile', 'css:compile'], () => {
    const proxyURL = process.env.BS_PROXY_URL || 'localhost:8000';
    const openBrowser = !(process.env.BS_OPEN_BROWSER === 'false');
    browserSync({
        proxy: proxyURL,
        open: openBrowser,
        serveStatic: [{
            route: '/media',
            dir: 'static_build'
        }]
    });
});

gulp.task('reload-other', ['assets'], browserSync.reload);
gulp.task('reload-css', ['css:compile'], browserSync.reload);
gulp.task('reload-js', ['js:compile'], browserSync.reload);
gulp.task('reload', browserSync.reload);

// --------------------------
// DEV/WATCH TASK
// --------------------------
gulp.task('watch', ['browser-sync'], () => {
    gulp.watch([
        'media/**/*',
        '!media/css/**/*',
        '!media/js/**/*'
    ], ['reload-other']);

    // --------------------------
    // watch:css, less, and sass
    // --------------------------
    gulp.watch('media/css/**/*', ['reload-css']);

    // --------------------------
    // watch:js
    // --------------------------
    gulp.watch('media/js/**/*.js', ['js:lint', 'reload-js']);

    // --------------------------
    // watch:html
    // --------------------------
    gulp.watch('bedrock/*/templates/**/*.html', ['reload']);

    log.info(colors.bgGreen('Watching for changes...'));
});

gulp.task('build', ['assets', 'js:minify', 'css:minify']);

gulp.task('default', ['watch']);
