let projectFolder = 'dist';
let sourceFolder = 'src';
let basedir = `./${projectFolder}/**/*`;

let path = {
    build: {
        html: `${projectFolder}/`,
        css: `${projectFolder}/css/`,
        js: `${projectFolder}/js/`,
        libs: `${projectFolder}/libs/`,
        img: `${projectFolder}/img/`,
        fonts: `${projectFolder}/fonts/`
    },
    src: {
        html: [`${sourceFolder}/*.html`, `!${sourceFolder}/_*.html`],
        css: `${sourceFolder}/scss/style.scss`,
        js: `${sourceFolder}/js/script.js`,
        libs: `${sourceFolder}/libs/*`,
        img: `${sourceFolder}/img/**/*.{jpg,png,svg,gif,ico,webp}`,
        fonts: `${sourceFolder}/fonts/**/*.{ttf,woff,woff2,svg,eot}`
    },
    watch: {
        html: `${sourceFolder}/**/*.html`,
        css: `${sourceFolder}/scss/**/*.scss`,
        js: `${sourceFolder}/js/**/*.js`,
        img: `${sourceFolder}/img/**/*.{jpg,png,svg,gif,ico,webp}`
    },
    clean: basedir
}

let {src, dest} = require('gulp'),
    gulp = require('gulp'),
    browsersync = require('browser-sync').create(),
    fileInclude = require('gulp-file-include'), /* шаблонизатор для файлов, команда @include для любых типов файлов */
    del = require('del'), /* удаление папок и файлов */
    scss = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    groupMediaQueries = require('gulp-group-css-media-queries'), /* группировка всех медиазапросов в конец файла, все селекторы под одним запросом */
    cleanCSS = require('gulp-clean-css'),
    rename = require('gulp-rename'),
    imagemin = require('gulp-imagemin'),
    webp = require('gulp-webp'), /* конвертация изображений в webp */
    webphtml = require('gulp-webp-html'), /* вставка webp в html файл */
    webpcss = require('gulp-webpcss'), /* подключение webp в css файлах через добавление класса .webp к body, сам класс будет добавляться js'ом */
    svgSprite = require('gulp-svg-sprite'),
    browserify = require('browserify'),
    source = require('vinyl-source-stream');

function browserSync() {
    browsersync.init({
        server: {
            baseDir: `./${projectFolder}/`
        },
        port: 3001,
        notify: false
    });
}

function html() {
    return src(path.src.html)
        .pipe(fileInclude())
        .pipe(webphtml())
        .pipe(dest(path.build.html)).pipe(browsersync.stream()) /* команда обновления страницы */
}

function images() {
    return src(path.src.img)
        .pipe(webp({
            quality: 70
        }))
        .pipe(dest(path.build.img))
        .pipe(src(path.src.img))
        .pipe(imagemin([
            imagemin.gifsicle({interlaced: true}),
            imagemin.mozjpeg({quality: 55, progressive: true}),
            imagemin.optipng({optimizationLevel: 5}),
            imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false}
                ]
            })
        ]))
        .pipe(dest(path.build.img))
        .pipe(browsersync.stream()) /* команда обновления страницы */
}

function js() {
    return browserify(path.src.js)
        .transform("babelify",
            {
                presets: ["@babel/preset-env",
                    {
                        plugins: [
                            "@babel/plugin-transform-classes",
                            "@babel/plugin-proposal-class-properties",
                            "transform-es2015-arrow-functions",
                            "transform-es2015-classes",
                            "transform-es2015-destructuring",
                            "transform-es2015-modules-commonjs",
                            "transform-es2015-object-super",
                        ],
                    }
                ],
                sourceMaps: true,
                global: true,
                ignore: [/\/node_modules\/(?!your module folder\/)/]
            })
        .bundle()
        .pipe(source('scripts.js'))
        /* .pipe(uglify())*/
        .pipe(rename({
            extname: '.min.js'
        }))
        .pipe(dest(path.build.js))
        .pipe(browsersync.stream()) /* команда обновления страницы */
}

function libs() {
    return src(path.src.libs)
        .pipe(dest(path.build.libs));
}

function fonts() {
    return src(path.src.fonts)
        .pipe(dest(path.build.fonts));
}

function watchFiles() {
    gulp.watch([path.watch.html], html);
    gulp.watch([path.watch.css], css);
    gulp.watch([path.watch.js], js);
    gulp.watch([path.watch.img], images);
}

function clean() {
    return del(path.clean);
}

function css() {
    return src(path.src.css)
        .pipe(scss({
            outputStyle: 'expanded'
        }))
        .pipe(groupMediaQueries())
        .pipe(autoprefixer({
            overrideBrowserslist: ['last 5 versions'],
            cascade: true
        }))
        .pipe(webpcss())
        .pipe(dest(path.build.css)) /* выгрузка неоптимизированных стилей для удобной работы с файлом */
        .pipe(cleanCSS())
        .pipe(rename({
            extname: '.min.css'
        }))
        .pipe(dest(path.build.css)) /* выгрузка оптимизированных сжатых стилей  */
        .pipe(browsersync.stream());
}

gulp.task('svgsprite', function () {
    return gulp.src([`${sourceFolder}/iconsprite/*.svg`])
        .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: '../icons/icons.svg',
                    example: true // создает html-файл с примерами иконок
                }
            }
        }))
        .pipe(dest(path.build.img))
});

let build = gulp.series(clean, gulp.parallel(css, js, libs, fonts, html, images));
let watch = gulp.parallel(build, watchFiles, browserSync);

exports.clean = clean;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.default = watch;