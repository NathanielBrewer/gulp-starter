const autoprefixer = require('gulp-autoprefixer');
const browsersync = require('browser-sync').create();
const cached = require('gulp-cached');
const del = require('del');
const eol = require('gulp-eol');
const fileinclude = require('gulp-file-include');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const npmdist = require('gulp-npm-dist');
const replace = require('gulp-replace');
const sass = require('gulp-sass')(require('sass'));
const uglify = require('gulp-uglify');
const useref = require('gulp-useref');

// Define paths
const paths = {
  base: {
    base: {
      dir: './'
    },
    node: {
      dir: './node_modules'
    },
    packageLock: {
      files: './package-lock.json'
    }
  },
  dist: {
    base: {
      dir: './dist'
    },
    libs: {
      dir: './dist/assets/libs'
    }
  },
  src: {
    audio: {
      dir: './src/assets/audio',
      files: './src/assets/audio/**/*'
    },
    base: {
      dir: './src',
      files: './src/**/*'
    },
    css: {
      dir: './src/assets/css',
      files: './src/assets/css/**/*'
    },
    html: {
      dir: './src',
      files: './src/**/*.html',
    },
    images: {
      dir: './src/assets/images',
      files: './src/assets/images/**/*',
    },
    js: {
      dir: './src/assets/js',
      files: './src/assets/js/**/*'
    },
    partials: {
      dir: './src/partials',
      files: './src/partials/**/*'
    },
    scss: {
      dir: './src/assets/scss',
      files: './src/assets/scss/**/*',
      main: './src/assets/scss/*.scss'
    },
    tmp: {
      dir: './src/.tmp',
      files: './src/.tmp/**/*'
    }
  }
};

gulp.task('browsersync', function(callback) {
  browsersync.init({
    server: {
      baseDir: [paths.src.tmp.dir, paths.src.base.dir, paths.base.base.dir],
      middleware: [
        {
          route: 'http://commons.wikimedia.org/*',
          handle: function (res, res, next) {
            console.log('gulpfile.browsersync https://www.mediawiki.org/wiki/Special:MyLanguage/API:Random res', res);
            res.setHeader('Access-Control-Allow-Origin', '*');
            next();
          }
        },
        {
          route: '/experimental',
          handle: function (res, res, next) {
            console.log('gulpfile.browsersync /experimental res.body', res.body);
            res.setHeader('Access-Control-Allow-Origin', '*');
            next();
          }
        },
      ],
    },
  });
  callback();
});

gulp.task('browsersyncReload', function(callback) {
  browsersync.reload();
  callback();
});

gulp.task('watch', function() {
  gulp.watch(paths.src.scss.files, gulp.series('scss'));
  gulp.watch([paths.src.js.files, paths.src.images.files], gulp.series('browsersyncReload'));
  gulp.watch([paths.src.html.files, paths.src.partials.files], gulp.series('fileinclude', 'browsersyncReload'));
});

gulp.task('scss', function() {
  return gulp
    .src(paths.src.scss.main)
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['> 1%']
    }))
    .pipe(gulp.dest(paths.src.css.dir))
    .pipe(browsersync.stream());
});

gulp.task('fileinclude', function(callback) {
  return gulp
    .src([
      paths.src.html.files,
      '!' + paths.src.tmp.files,
      '!' + paths.src.partials.files
    ])
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file',
      indent: true
    }))
    .pipe(cached())
    .pipe(gulp.dest(paths.src.tmp.dir));
});

gulp.task('clean:tmp', function(callback) {
  del.sync(paths.src.tmp.dir);
  callback();
});

gulp.task('clean:packageLock', function(callback) {
  del.sync(paths.base.packageLock.files);
  callback();
});

gulp.task('clean:dist', function(callback) {
  del.sync(paths.dist.base.dir);
  callback();
});

gulp.task('copy:all', function() {
  return gulp
    .src([
      paths.src.base.files,
      '!' + paths.src.partials.dir, '!' + paths.src.partials.files,
      '!' + paths.src.scss.dir, '!' + paths.src.scss.files,
      '!' + paths.src.tmp.dir, '!' + paths.src.tmp.files,
      '!' + paths.src.js.dir, '!' + paths.src.js.files,
      '!' + paths.src.css.dir, '!' + paths.src.css.files,
      '!' + paths.src.html.files,
    ])
    .pipe(gulp.dest(paths.dist.base.dir));
});

gulp.task('copy:libs', function() {
  return gulp
    .src(npmdist(), { base: paths.base.node.dir })
    .pipe(gulp.dest(paths.dist.libs.dir));
});

gulp.task('html', function() {
  return gulp
    .src([
      paths.src.html.files,
      '!' + paths.src.tmp.files,
      '!' + paths.src.partials.files
    ])
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file',
      indent: true
    }))
    .pipe(eol())
    .pipe(replace(/href="(.{0,10})node_modules/g, 'href="$1assets/libs'))
    .pipe(replace(/src="(.{0,10})node_modules/g, 'src="$1assets/libs'))
    .pipe(useref())
    .pipe(cached())
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulp.dest(paths.dist.base.dir));
});

gulp.task('build', gulp.series('clean:tmp', 'clean:packageLock', 'clean:dist', 'copy:all', 'copy:libs', 'scss', 'html'));

gulp.task('default', gulp.series(gulp.parallel('fileinclude', 'scss'), gulp.parallel('browsersync', 'watch')));
