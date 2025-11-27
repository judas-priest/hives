/**
 * Main entry function and bootstrap
 * Lines 278186-278315 from original k_da_deobfuscated.js
 * This file is part of the k_da application split from webpack bundle
 */

async function $ur() {
  sFn();
  let t = process.cwd(),
    e = b9(t);
  (await PXt(), Ie.setLanguage(e.merged.language || 'ru'));
  try {
    e.merged.language
      ? (process.env.KODA_RESPONSE_LANGUAGE = String(e.merged.language))
      : process.env.KODA_RESPONSE_LANGUAGE || (process.env.KODA_RESPONSE_LANGUAGE = 'ru');
  } catch {}
  if ((await JXt(), e.errors.length > 0)) {
    for (let m of e.errors) {
      let E = `Error in ${m.path}: ${m.message}`;
      (process.env.NO_COLOR || (E = `\x1B[31m${E}\x1B[0m`),
        console.error(E),
        console.error(`Please fix ${m.path} and try again.`));
    }
    process.exit(1);
  }
  let r = await ylr(),
    n = hAe(t),
    i = await gAe(e.merged, n, _9, r),
    a = new Q9({ stderr: !0, debugMode: i.getDebugMode() });
  if (
    (a.patch(),
    yk(a.cleanup),
    tFn.setDefaultResultOrder(nFn(e.merged.dnsResolutionOrder)),
    r.promptInteractive &&
      !process.stdin.isTTY &&
      (console.error(
        'Error: The --prompt-interactive flag is not supported when piping input from stdin.'
      ),
      process.exit(1)),
    i.getListExtensions())
  ) {
    console.log('Installed extensions:');
    for (let m of n) console.log(`- ${m.config.name}`);
    process.exit(0);
  }
  let s = e.merged.selectedAuthType;
  s || (e.setValue('User', 'selectedAuthType', hn.WITHOUT_AUTH), (s = hn.WITHOUT_AUTH));
  let o = jz();
  if (!(!!s && s !== hn.WITHOUT_AUTH && o)) {
    let m = e.merged.model;
    (m && m !== 'KodaAgent' && e.setValue('User', 'model', 'KodaAgent'),
      r.model && r.model !== 'KodaAgent' && (r.model = 'KodaAgent'));
  }
  if (
    (Uar(i.getDebugMode()),
    await i.initialize(),
    i.getIdeMode() && (await i.getIdeClient().connect(), qM(i, new iC(nC.START))),
    Ya.loadCustomThemes(e.merged.customThemes),
    e.merged.theme &&
      (Ya.setActiveTheme(e.merged.theme) ||
        console.warn(`Warning: Theme "${e.merged.theme}" not found.`)),
    !process.env.SANDBOX)
  ) {
    let m = e.merged.autoConfigureMaxOldSpaceSize ? iFn(i) : [],
      E = i.getSandbox();
    if (E) {
      if (e.merged.selectedAuthType && !e.merged.useExternalAuth)
        try {
          let v = Sb(e.merged.selectedAuthType);
          if (v) throw new Error(v);
          await i.refreshAuth(e.merged.selectedAuthType);
        } catch (v) {
          (console.error('Error authenticating:', v), process.exit(1));
        }
      (await Nur(E, m, i), process.exit(0));
    } else m.length > 0 && (await aFn(m), process.exit(0));
  }
  if (
    (e.merged.selectedAuthType === hn.LOGIN_WITH_GITHUB &&
      i.isBrowserLaunchSuppressed() &&
      (await cme(i)),
    i.getExperimentalZedIntegration())
  )
    return Gur(i, e, n, r);
  let u = i.getQuestion(),
    c = [...(await Our()), ...(await Lur(t))];
  if (i.isInteractive()) {
    let m = await fb();
    (await qnr(), oFn(XLn(t), e));
    let E = Jge(
      (0, OAe.jsx)(qur.default.StrictMode, {
        children: (0, OAe.jsx)(KGe.Provider, {
          value: e,
          children: (0, OAe.jsx)(Iur, { config: i, settings: e, startupWarnings: c, version: m }),
        }),
      }),
      { exitOnCtrlC: !1 }
    );
    yk(() => E.unmount());
    return;
  }
  if (!process.stdin.isTTY) {
    let m = await Tur();
    m &&
      (u = `${m}

${u}`);
  }
  u || (console.error('No input provided via stdin.'), process.exit(1));
  let p = Math.random().toString(16).slice(2);
  GM(i, {
    'event.name': 'user_prompt',
    'event.timestamp': new Date().toISOString(),
    prompt: u,
    prompt_id: p,
    auth_type: i.getContentGeneratorConfig()?.authType,
    prompt_length: u.length,
  });
  let h = await Pur(e.merged.selectedAuthType, e.merged.useExternalAuth, i);
  (await Fur(h, u, p), process.exit(0));
}
function oFn(t, e) {
  if (!e.merged.hideWindowTitle) {
    let r = (process.env.CLI_TITLE || `Koda - ${t}`).replace(/[\x00-\x1F\x7F]/g, '');
    (process.stdout.write(`\x1B]2;${r}\x07`),
      process.on('exit', () => {
        process.stdout.write('\x1B]2;\x07');
      }));
  }
}
$ur().catch((t) => {
  (console.error('An unexpected critical error occurred:'),
    t instanceof Error ? console.error(t.stack) : console.error(String(t)),
    process.exit(1));
});
