(function () {
"use strict";
const pmoOrigin = "https://pmo.example.test";
const complete = "測試完成";

function unitName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name === "（未指定）" ? "" : name;
}

function projectAt(url, view) {
  const actual = new URL(url);
  const match = /^\/projects\/([a-z0-9]+)\/(gantt|tasks)$/.exec(actual.pathname);
  return actual.origin === pmoOrigin && !actual.username && !actual.password && match?.[2] === view
    ? match[1] : null;
}

function acceptedEdit(edit, now = Date.now()) {
  return edit?.actor === "win" && /^:[a-z0-9]+$/.test(edit.id)
    && typeof edit.title === "string" && /^測試[-－]/u.test(edit.title)
    && edit.title.length <= 1000 && typeof edit.before === "string" && edit.before.length > 0
    && edit.before !== complete && edit.after === complete && typeof edit.unit === "string"
    && Number.isSafeInteger(edit.at) && Math.abs(now - edit.at) <= 15_000;
}

function taipeiMinute(timestamp) {
  const match = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(timestamp);
  if (!match) return NaN;
  const [, year, month, day, hour, minute] = match;
  return Date.parse(`${year}-${month}-${day}T${hour}:${minute}:00+08:00`);
}

function confirmedChange(history, edit) {
  const changes = history.filter(entry => entry.title === edit.title && entry.field === "狀態");
  const latest = changes[0];
  if (!latest || latest.actor !== "win" || latest.before !== edit.before || latest.after !== complete) return null;
  const minute = taipeiMinute(latest.time);
  const saveMinute = Math.floor(edit.at / 60_000) * 60_000;
  if (!Number.isFinite(minute) || minute < saveMinute || minute > saveMinute + 60_000) return null;
  // PMO shows timestamps to the minute. The position among Win's completions
  // distinguishes a completion after reopening from a second read of the same event.
  const occurrence = changes.filter(entry => entry.time === latest.time && entry.actor === "win"
    && entry.after === complete && entry.before !== complete).length;
  return { ...latest, occurrence };
}

function confirmedTask(task, edit) {
  if (task?.matches !== 1 || task.id !== edit.id) throw new Error("無法從任務清單核對唯一的卡片 ID。");
  if (task.status !== complete) throw new Error("任務清單尚未顯示測試完成。");
  if (unitName(task.unit) === null || unitName(task.unit) !== unitName(edit.unit)) {
    throw new Error("已儲存的需求單位與本次編輯不一致。");
  }
  return task;
}

function referenceURLs(urls, project) {
  const links = new Set();
  for (const value of Array.isArray(urls) ? urls : []) {
    if (typeof value !== "string") continue;
    let url;
    try { url = new URL(value); } catch { continue; }
    if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname && !url.username && !url.password) {
      links.add(url.href);
    }
  }
  return links.size > 0 ? [...links] : [`${pmoOrigin}/projects/${project}/tasks`];
}

window.pmoRules = { complete, unitName, acceptedEdit, confirmedChange, confirmedTask, referenceURLs };
})();
