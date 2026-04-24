// auth.js

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  loadRemotePlannerData,
  loadRemoteFinanceData,
  loadLocalBackup,
  loadFinanceLocal,
} from "./storage.js";

function getState() {
  return window.AppState;
}

function getRefs() {
  return window.AppRefs;
}

function getFirebaseRefs() {
  return window.FirebaseRefs;
}

export function initAuth({ renderAll }) {
  const refs = getRefs();
  const state = getState();
  const { auth } = getFirebaseRefs();
  let authResolved = false;

  refs.showLoginTabBtn?.addEventListener("click", () => switchAuthTab("login"));
  refs.showSignupTabBtn?.addEventListener("click", () => switchAuthTab("signup"));

  refs.loginBtn?.addEventListener("click", handleLogin);
  refs.signupBtn?.addEventListener("click", handleSignup);
  refs.logoutBtn?.addEventListener("click", handleLogout);

  if (!navigator.onLine) {
    setTimeout(() => {
      if (authResolved) return;
      enterOfflineLocalMode(renderAll);
    }, 1200);
  }

  onAuthStateChanged(auth, async (user) => {
    authResolved = true;
    state.currentUser = user;

    if (user) {
      showAppUI(user);
      await loadRemotePlannerData(user.uid);
      await loadRemoteFinanceData(user.uid);
      renderAll();
    } else {
      showAuthUI();
      const localPlannerData = loadLocalBackup();
      state.items = localPlannerData.items;
      state.projects = localPlannerData.projects;
      state.inboxItems = localPlannerData.inboxItems;
      state.financeData = loadFinanceLocal();
      renderAll();
    }
  });
}

function enterOfflineLocalMode(renderAll) {
  const state = getState();

  showAppUI({ email: "오프라인 모드" });
  const localPlannerData = loadLocalBackup();
  state.currentUser = null;
  state.items = localPlannerData.items;
  state.projects = localPlannerData.projects;
  state.inboxItems = localPlannerData.inboxItems;
  state.financeData = loadFinanceLocal();
  renderAll();
}

export function showAuthUI() {
  const refs = getRefs();

  refs.authLoadingScreen?.classList.add("hidden");
  refs.authSection?.classList.remove("hidden");
  refs.appSection?.classList.add("hidden");

  if (refs.currentUserEmail) {
    refs.currentUserEmail.textContent = "";
  }

  clearAuthError();
}

export function showAppUI(user) {
  const refs = getRefs();

  refs.authLoadingScreen?.classList.add("hidden");
  refs.authSection?.classList.add("hidden");
  refs.appSection?.classList.remove("hidden");

  if (refs.currentUserEmail) {
    refs.currentUserEmail.textContent = user.email || "";
  }

  clearAuthError();
}

export function switchAuthTab(mode) {
  const refs = getRefs();
  const isLogin = mode === "login";

  refs.loginFormWrap?.classList.toggle("hidden", !isLogin);
  refs.signupFormWrap?.classList.toggle("hidden", isLogin);

  refs.showLoginTabBtn?.classList.toggle("active", isLogin);
  refs.showSignupTabBtn?.classList.toggle("active", !isLogin);

  clearAuthError();
}

export async function handleLogin() {
  const refs = getRefs();
  const { auth } = getFirebaseRefs();

  const email = refs.loginEmail?.value.trim() || "";
  const password = refs.loginPassword?.value || "";

  clearAuthError();

  if (!email || !password) {
    showAuthError("??李??⑤궢 ??쑬?甕곕뜇?뉒몴???낆젾??뤾쉭??");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);

    refs.loginEmail.value = "";
    refs.loginPassword.value = "";
  } catch (error) {
    showAuthError(getFirebaseAuthErrorMessage(error));
  }
}

export async function handleSignup() {
  const refs = getRefs();
  const { auth } = getFirebaseRefs();

  const email = refs.signupEmail?.value.trim() || "";
  const password = refs.signupPassword?.value || "";
  const confirm = refs.signupPasswordConfirm?.value || "";

  clearAuthError();

  if (!email || !password || !confirm) {
    showAuthError("筌뤴뫀諭????????낆젾??뤾쉭??");
    return;
  }

  if (password.length < 6) {
    showAuthError("??쑬?甕곕뜇???6????곴맒??곷선????몃빍??");
    return;
  }

  if (password !== confirm) {
    showAuthError("??쑬?甕곕뜇???類ㅼ뵥????깊뒄??? ??녿뮸??덈뼄.");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);

    refs.signupEmail.value = "";
    refs.signupPassword.value = "";
    refs.signupPasswordConfirm.value = "";
  } catch (error) {
    showAuthError(getFirebaseAuthErrorMessage(error));
  }
}

export async function handleLogout() {
  const { auth } = getFirebaseRefs();

  try {
    await signOut(auth);
  } catch (error) {
    alert("嚥≪뮄??袁⑹뜍 餓???살첒揶쎛 獄쏆뮇源??됰뮸??덈뼄.");
    console.error(error);
  }
}

export function showAuthError(message) {
  const refs = getRefs();
  if (!refs.authMessage) return;

  refs.authMessage.textContent = message;
  refs.authMessage.className = "auth-message error";
}

export function clearAuthError() {
  const refs = getRefs();
  if (!refs.authMessage) return;

  refs.authMessage.textContent = "";
  refs.authMessage.className = "auth-message hidden";
}

export function getFirebaseAuthErrorMessage(error) {
  const code = error?.code || "";

  if (code.includes("invalid-credential")) {
    return "??李???癒?뮉 ??쑬?甕곕뜇?뉐첎? ??而?몴?? ??녿뮸??덈뼄.";
  }
  if (code.includes("email-already-in-use")) {
    return "??? 揶쎛??낅쭆 ??李??깆뿯??덈뼄.";
  }
  if (code.includes("weak-password")) {
    return "??쑬?甕곕뜇?뉐첎? ??댭???鍮??덈뼄.";
  }
  if (code.includes("invalid-email")) {
    return "??李???類ㅻ뻼????而?몴?? ??녿뮸??덈뼄.";
  }
  if (code.includes("too-many-requests")) {
    return "?遺욧퍕????댭?筌띾‘???덈뼄. ?醫롫뻻 ????쇰뻻 ??뺣즲??뤾쉭??";
  }
  if (code.includes("network-request-failed")) {
    return "??쎈뱜??곌쾿 ?怨뚭퍙???類ㅼ뵥??뤾쉭??";
  }

  return "?紐꾩쵄 筌ｌ꼶??餓???살첒揶쎛 獄쏆뮇源??됰뮸??덈뼄.";
}
