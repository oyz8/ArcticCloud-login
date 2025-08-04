# ⭐ Star 星星走起 动动发财手点点⭐Star

# 🌐 Cloudflare Workers VPS 续期脚本

本项目是一个基于 Cloudflare Workers 的 VPS 自动续期脚本，适用于 [vps.polarbear.nyc.mn](https://vps.polarbear.nyc.mn) 控制台。通过定时任务或手动触发，自动登录并续期对应的 VPS 服务。

## ✅ 功能特点

- 🔄 支持多台 VPS 自动续期
- 📆 支持 Cron 定时触发
- 🔔 支持 PushPlus 通知推送
- ⚡ 手动访问 URL 即可立即触发续期

## 🛠️ 使用步骤

1. **部署到 Cloudflare Workers**
3. **复制_worker.js内容**
4. **添加环境变量**
   - `ARCTICCLOUD_TOKEN`（登录格式：用户名:密码）
   - `PUSHPLUS_TOKEN` xxxxxxxxxxxxxxxxxxxx（你的PUSHPLUS通知）
   - `VPS_LIST` （格式：123:DE-Frankfurt,321:US-Dallas,654:UK-Portsmouth,456:CA-Quebec）
   - `VPS 对应编号在哪里？ 访问官网后台，产品管理，打开一个管理在链接那里可以看到你的对应编号。
![示例输出](./ui.png)
5. **配置定时触发 Cron**
   示例：`18 4 1-31/3 * *` → 每 3 天的 04:18 自动运行

## 🌍 手动触发

访问 Cloudflare Workers 的地址即可手动启动续期流程。


