const Router = require('koa-router');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const logger = require('../util/logger');
const fs = require('fs');
const path = require('path');
const adapter = new FileSync(require.resolve('../db.json'));
const db = low(adapter);
const { push, fileMap } = require('../util/helper');
const depTree = require('../util/depTree');
const router = new Router();

router.get('/api/product/:id', (ctx, next) => {
    const { id } = ctx.params;
    logger.info('Current Request id:', id);
    const regRet = /([^_]+)/.exec(id);
    if (regRet == null) ctx.throw(404);
    const ret = db
        .get('product')
        .get(regRet[0])
        .value();
    if (ret == undefined) ctx.throw(404);
    ctx.body = ret;
});

// common
router.get('/api/:domain', (ctx, next) => {
    const { domain } = ctx.params;
    logger.info('Current Request Params:', domain);
    const ret = db.get(domain).value();
    if (ret == undefined) ctx.status = 404;
    else ctx.body = ret;
});

router.get('/api/:domain/:type', (ctx, next) => {
    const { domain, type } = ctx.params;
    logger.info('Current Request Params2:', domain, type);
    const ret = db
        .get(domain)
        .get(type)
        .value();
    if (ret == undefined) ctx.status = 404;
    else ctx.body = ret;
});

router.get(/\.(js|css|png|jpg|jpeg)$/, async (ctx, next) => {
    let filePath = ctx.path;
    if (/^\/mimg\//.test(filePath)) filePath =filePath.substr(1);
    else filePath = path.resolve('../dist', filePath.substr(1));
    logger.ok(filePath);
    depTree.addDep({
        relPath: ctx.path,
        filePath
    });
    await next();
});

router.get('/mimg/:filename', async (ctx, next) => {
    const { filename } = ctx.params;
    const filepath = require.resolve(`../mimg/${filename}`);
    if (fs.existsSync(filepath)) {
        ctx.body = fs.createReadStream(filepath);
        const ext = path.extname(filepath) || 'jpg';
        ctx.type = `image/${ext}`;
    } else {
        logger.error('Image not found:', filepath);
        await next();
    }
});

router.get(/(\.html|\/[\w-]*)$/, async (ctx, next) => {
    // disable cache
    ctx.res.setHeader('Cache-Control', 'public, max-age=0');
    await next();
});
module.exports = router;
