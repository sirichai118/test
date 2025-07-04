(function () {
  if (location.origin + location.pathname !== "https://popmartth.rocket-booking.app/booking") return;

  const delay = (ms) => new Promise(res => setTimeout(res, ms));
  const bookingUrl = "https://popmartth.rocket-booking.app/booking";

  const log = (msg) => console.log(`[BOT] ${msg}`);

  const branches = [
    "Terminal 21", "Central Ladprao", "Siam Center", "Fashion Island", "Centralworld",
    "MEGABANGNA", "Siam Square", "Emsphere", "Central Pattaya", "Seacon Square",
    "Central Westgate", "Central Chiangmai", "Discovery Plaza"
  ];

  const times = Array.from({ length: 22 }, (_, i) => {
    const h = 10 + Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    return `${h.toString().padStart(2, "0")}:${m}`;
  });

  const subtractSeconds = (timeStr, sec) => {
    const [h, m, s] = timeStr.split(":").map(Number);
    const total = h * 3600 + m * 60 + s - sec;
    const hh = String(Math.floor(total / 3600)).padStart(2, "0");
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const getButtonByText = (text) => {
    const btn = [...document.querySelectorAll("button")].find(
      b => b.innerText.trim() === text && !b.disabled
    );
    log(btn ? `✅ เจอปุ่ม "${text}"` : `❌ ยังไม่เจอปุ่ม "${text}"`);
    return btn;
  };

  const clickButtonByText = async (text, waitBefore = 300) => {
    log(`⏳ รอปุ่ม "${text}"`);
    let btn;
    while (!(btn = getButtonByText(text))) await delay(200);
    await delay(waitBefore + Math.random() * 200);
    log(`👉 คลิกปุ่ม "${text}"`);
    btn.click();
  };

  const waitForOverlayToDisappear = async (timeout = 20000) => {
    log("⏳ รอ overlay หาย...");
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const overlay = document.querySelector('.ant-spin, .loading-overlay, [aria-busy="true"]');
      if (!overlay) {
        log("✅ overlay หายแล้ว");
        return;
      }
      await delay(300);
    }
    log("⚠️ overlay ไม่หายภายในเวลา");
  };

  const waitForBookingSuccessOrRestart = async (timeout = 15000) => {
    log("⏳ ตรวจสอบจองสำเร็จหรือไม่...");
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const foundText = [...document.querySelectorAll("*")].some(el =>
        /Booking Successful/i.test(el.textContent || "")
      );
      const confirmBtn = getButtonByText("ยืนยัน");
      if (foundText || confirmBtn) {
        log("🎉 พบหน้าจองสำเร็จแล้ว!");
        return true;
      }
      await delay(500);
    }
    log("🔁 ไม่พบหน้าสำเร็จ รีโหลด...");
    window.location.href = bookingUrl;
    return false;
  };

  const createModal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDay = tomorrow.getDate().toString().padStart(2, "0");

    const modalHtml = `
      <div id="popmart-bot-modal" style="position:fixed;z-index:99999;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;">
        <div style="background:white;padding:20px;border-radius:12px;max-width:360px;width:100%;font-family:sans-serif;position:relative;">
          <button id="closeModalBtn" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:18px;cursor:pointer;">×</button>
          <h2 style="margin-top:0;font-size:18px;">🛍️ Pop Mart Auto Bot</h2>

          <label>เลือกสาขา:</label>
          <select id="branchSelect" style="width:100%;margin-bottom:10px;padding:6px;">
            ${branches.map(branch => `<option ${branch === "Central Westgate" ? "selected" : ""}>${branch}</option>`).join("")}
          </select>

          <div style="display:flex;gap:10px;margin-bottom:10px;">
            <div style="flex:1;">
              <label>วัน:</label>
              <select id="dateSelect" style="width:100%;padding:6px;">
                ${Array.from({ length: 31 }, (_, i) => {
                  const d = (i + 1).toString().padStart(2, "0");
                  return `<option value="${d}" ${d === defaultDay ? "selected" : ""}>${d}</option>`;
                }).join("")}
              </select>
            </div>
            <div style="flex:1;">
              <label>เวลา:</label>
              <select id="timeSelect" style="width:100%;padding:6px;">
                ${times.map(t => `<option ${t === "12:00" ? "selected" : ""}>${t}</option>`).join("")}
              </select>
            </div>
          </div>

          <label>เวลาเริ่มทำงาน (15 วิก่อน):</label>
          <input id="runCheckTime" type="text" value="14:59:45" style="width:100%;padding:6px;margin-bottom:10px;" readonly />

          <label>เวลากด Register (HH:MM:SS):</label>
          <input id="registerTime" type="text" value="15:00:00" style="width:100%;padding:6px;margin-bottom:10px;" />

          <button id="startBotBtn" style="background:#d00;color:white;padding:8px 12px;width:100%;border:none;border-radius:6px;">เริ่มบอท</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    const modal = document.getElementById("popmart-bot-modal");
    document.getElementById("closeModalBtn").onclick = () => modal.remove();
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal) modal.remove();
    });

    document.getElementById("registerTime").addEventListener("input", (e) => {
      const v = e.target.value;
      if (/^\d{2}:\d{2}:\d{2}$/.test(v)) {
        document.getElementById("runCheckTime").value = subtractSeconds(v, 15);
      }
    });
  };

  const runBot = async (branch, day, timeSlot) => {
    const startTime = Date.now();
    log("🚀 เริ่มทำงาน...");

    let attempt = 0;
    while (attempt < 3) {
      const regBtn = getButtonByText("Register");
      if (regBtn) {
        regBtn.click();
        await delay(500);
        if (getButtonByText(branch)) break;
        const closeBtn = getButtonByText("×");
        if (closeBtn) closeBtn.click();
        attempt++;
        await delay(500);
      }
      await delay(200);
    }

    if (attempt >= 3) {
      alert("❌ ไม่สามารถเปิด popup เลือกสาขาได้");
      return;
    }

    await clickButtonByText(branch);
    await clickButtonByText("Next");
    await waitForOverlayToDisappear();

    await clickButtonByText(day);
    await waitForOverlayToDisappear();

    await clickButtonByText(timeSlot);
    await clickButtonByText("Confirm");
    await waitForOverlayToDisappear();

    const checkbox = document.querySelector('input[type="checkbox"]');
    if (checkbox && !checkbox.checked) {
      checkbox.click();
      log("☑️ คลิก checkbox");
    }

    await delay(500);
    await clickButtonByText("Confirm");

    while (!getButtonByText("Confirm Booking")) await delay(500);
    await delay(400 + Math.random() * 200);
    getButtonByText("Confirm Booking").click();
    log("✅ คลิก Confirm Booking");

    const ok = await waitForBookingSuccessOrRestart();
    if (ok) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      log(`🎉 จองสำเร็จใน ${elapsed} วินาที`);
      alert(`🎉 จองสำเร็จแล้ว!\n⏱️ ใช้เวลา ${elapsed} วินาที`);
    }
  };

  const init = () => {
    createModal();
    document.getElementById("startBotBtn").onclick = () => {
      const branch = document.getElementById("branchSelect").value.trim();
      const day = document.getElementById("dateSelect").value.trim();
      const timeSlot = document.getElementById("timeSelect").value.trim();
      const regTime = document.getElementById("registerTime").value.trim();
      const runTime = document.getElementById("runCheckTime").value.trim();

      if (!/^\d{2}:\d{2}:\d{2}$/.test(runTime) || !/^\d{2}:\d{2}:\d{2}$/.test(regTime)) {
        alert("❌ เวลาไม่ถูกต้อง (ควรเป็น HH:MM:SS)");
        return;
      }

      document.getElementById("popmart-bot-modal").remove();
      log("🚦 เริ่มนับถอยหลัง");
      log(`🕓 เวลาเริ่มบอท: ${runTime} | เวลา Register: ${regTime}`);

      const timer = setInterval(() => {
        const now = new Date();
        const nowStr = now.toTimeString().split(" ")[0];
        const [rh, rm, rs] = runTime.split(":").map(Number);
        const targetSec = rh * 3600 + rm * 60 + rs;
        const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const diff = targetSec - nowSec;

        log(`🕒 ${nowStr} | เหลือ ${diff}s ถึงเริ่มทำงาน`);

        if (diff <= 0) {
          clearInterval(timer);
          runBot(branch, day, timeSlot);
        }
      }, 500);
    };
  };

  init();
})();
