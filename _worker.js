// 从环境变量读取：

// ARCTICCLOUD_TOKEN（登录格式：用户名:密码）

// PUSHPLUS_TOKEN xxxxxxxxxxxxxxxxxxxx（你的PUSHPLUS通知）

// VPS_LIST （格式：123:DE-Frankfurt,321:US-Dallas,654:UK-Portsmouth,456:CA-Quebec）

// 依次对所有 VPS 续期

// 通过 PushPlus 发送续期结果通知

// 支持手动访问触发与定时触发（配合 Cloudflare Cron Trigger）

export default {
  // 手动访问触发
  async fetch(request, env, ctx) {
    return await handleRenewal(env);
  },

  // Cloudflare Cron 定时触发
  async scheduled(event, env, ctx) {
    console.log("⏰ 计划任务触发时间：", new Date(event.scheduledTime).toLocaleString("zh-CN"));
    await handleRenewal(env);
  }
};

// VPS 续期主逻辑
async function handleRenewal(env) {
  const ARCTICCLOUD_TOKEN = env.ARCTICCLOUD_TOKEN;
  const PUSHPLUS_TOKEN = env.PUSHPLUS_TOKEN;
  const VPS_LIST = env.VPS_LIST;

  const startTime = Date.now();

  if (!ARCTICCLOUD_TOKEN || !PUSHPLUS_TOKEN || !VPS_LIST) {
    return new Response("❌ 环境变量未设置或格式错误，必须设置 ARCTICCLOUD_TOKEN, PUSHPLUS_TOKEN, VPS_LIST", { status: 400 });
  }

  const [username, password] = ARCTICCLOUD_TOKEN.split(":");
  if (!username || !password) {
    return new Response("❌ ARCTICCLOUD_TOKEN 格式错误，需为 用户名:密码", { status: 400 });
  }

  const { VPS_NAME, VPS_IDS } = parseVpsList(VPS_LIST);
  if (VPS_IDS.length === 0) {
    return new Response("❌ VPS_LIST 格式错误或为空", { status: 400 });
  }

  const BASE_URL = "https://vps.polarbear.nyc.mn";
  let log = `## ArcticCloud VPS 续期任务\n\n🕒 开始时间：${new Date().toLocaleString("zh-CN")}\n\n`;

  // 登录获取 swapuuid Cookie
  const loginResp = await fetch(`${BASE_URL}/index/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `swapname=${encodeURIComponent(username)}&swappass=${encodeURIComponent(password)}`,
    redirect: "manual"
  });

  const cookieHeader = loginResp.headers.get("set-cookie");
  const match = /swapuuid=([^;]+)/.exec(cookieHeader || "");
  if (!match) {
    log += `❌ 登录失败，未能获取 swapuuid cookie\n`;
    await pushplus(PUSHPLUS_TOKEN, "VPS 登录失败", log);
    return new Response(log, { status: 500 });
  }

  const swapuuid = match[1];
  log += `✅ 登录成功，获取 swapuuid 成功\n\n`;

  // 续期每个 VPS
  for (const id of VPS_IDS) {
    const name = VPS_NAME[id];
    log += `🔁 开始续期：${name}\n`;

    const renewResp = await fetch(`${BASE_URL}/control/detail/${id}/pay/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": `swapuuid=${swapuuid}`
      },
      redirect: "manual"
    });

    const location = renewResp.headers.get("location") || "";
    let status = "❌", msg = "无返回内容";

    const successMatch = location.match(/success=([^&]+)/);
    const errorMatch = location.match(/error=([^&]+)/);

    if (successMatch) {
      msg = decodeURIComponent(successMatch[1]);
      status = "✅";
    } else if (errorMatch) {
      msg = decodeURIComponent(errorMatch[1]);
    }

    log += `${status} ${name}\n`;
    log += `返回内容：${msg}\n`;
    log += `--------------------------\n`;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  log += `\n✅ 所有任务完成，耗时 ${duration} 秒`;

  await pushplus(PUSHPLUS_TOKEN, "VPS 续期结果通知", log);

  return new Response(log, {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

// VPS_LIST 解析函数
function parseVpsList(vpsListStr) {
  const map = {};
  const ids = [];
  const pairs = vpsListStr.split(",");
  for (const pair of pairs) {
    const [idStr, name] = pair.split(":");
    const id = parseInt(idStr.trim(), 10);
    if (!isNaN(id) && name) {
      map[id] = name.trim();
      ids.push(id);
    }
  }
  return { VPS_NAME: map, VPS_IDS: ids };
}

// PushPlus 推送函数
async function pushplus(token, title, content) {
  if (!token) return;
  try {
    await fetch("https://www.pushplus.plus/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, title, content, template: "txt" })
    });
  } catch (err) {
    console.error("PushPlus 通知失败：", err);
  }
}
