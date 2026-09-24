# $bog_probe

Геометрия вёрстки из мол-теста через headless Chrome по CDP. Без puppeteer: сам находит установленный Chrome, поднимает статику из корня MAM, открывает страницу с нужным вьюпортом и возвращает то, что вернул скрипт в странице.

jsdom в node раскладку не считает: `getBoundingClientRect()` у всех узлов нули. «Блоки стоят в ряд», «панель не вылезает за экран на 400px» проверяются только в браузере. Проба это и делает.

Все модули серверные (`.node.ts`), в web-бандл не попадают.

## API

- `$bog_probe_run( opts )` — поднимает сервер и Chrome с временным профилем, ставит вьюпорт через `Emulation.setDeviceMetricsOverride`, ждёт `ready`, выполняет `script` в странице и возвращает его `return`. Всё закрывает в `finally`. Если Chrome не найден, возвращает `$bog_probe_skip`, не бросает.

  ```ts
  type $bog_probe_opts = {
      page: string     // от корня MAM: 'bog/smalljs/app/-/index.html#!section=docs'
      script: string   // тело функции, `return` даёт результат
      width?: number   // 1280
      height?: number  // 800
      scale?: number   // 1, плотность пикселей вьюпорта: 2 это ретина, холсты и картинки получают буфер вдвое
      ready?: string   // typeof $ !== 'undefined' && document.readyState === 'complete'
      limit?: number   // 30000 мс на готовность
      root?: string    // корень MAM, process.cwd()
      flags?: string[] // дописываются к аргументам Chrome, например [ "--use-angle=swiftshader" ]
  }
  ```

- `$bog_probe_rects({ ... opts, selectors })` — для каждого селектора `querySelector` → `{ left, top, width, height, right, bottom }` или `null`, плюс `viewport` (innerWidth/innerHeight) и `scroll` (scrollWidth/scrollHeight).
- `$bog_probe_test( bundle, fn, timeout = 300000 )` — обёртка для синхронного мол-теста: `spawnSync` дочернего node, который требует собранный `-/node.js` и зовёт `$[fn]()`. Возвращает stdout+stderr, при ненулевом коде `$mol_fail` с выводом. Нужна потому, что `$mol_test_run` убивает async-тест через 1000 мс, а Chrome стартует дольше. **Печатает сама проверка, обёртка молчит, пока всё хорошо:** то, что должно попасть в вывод (замеры, итоговая строка, которую сверяет тест), `fn` пишет сам — `$node.fs.writeSync( 1, … )`. Возвращённое значение обёртка НЕ печатает, иначе каждая строка выходила бы дважды: один раз из проверки, второй из обёртки. При падении обёртка печатает стек.
- Помощники для ассертов, чистые функции над прямоугольниками:
  - `$bog_probe_aligned( a, b, 'top' | 'left' | 'bottom' | 'right', tolerance = 1 )`
  - `$bog_probe_beside( left, right, gap_max = Infinity )` — `right` начинается не раньше конца `left` и они пересекаются по вертикали
  - `$bog_probe_inside( box, outer )`
  - `$bog_probe_fits( rects_result )` — `scroll.width <= viewport.width`, нет горизонтальной прокрутки
- Низкий уровень: `$bog_probe_chrome_bin()`, `$bog_probe_static`, `$bog_probe_browser` (`open`, `viewport`, `open_page`, `evaluate`, `until`, `press`, `close`).
- `press( key, code )` сам кладёт в `keyDown` поле `text` для печатных клавиш (`text: key`) и Enter (`text: '\r'`), служебным (Escape, Tab, стрелки) не кладёт. Без `text` на Enter и печатных клавишах `Input.dispatchKeyEvent` раскручивает головной процесс headless Chrome до гигабайт памяти. Поле `code` — физическая клавиша, как её читает `event.code`: `$bog_probe_code( 'h' )` даёт `KeyH`, цифра — `Digit7`, пробел — `Space`, служебные остаются своим именем.
- `send( method, params, session, limit = browser.limit, late )` ждёт ответа Chrome не дольше `limit` (по умолчанию 30 000 мс) и падает с именем команды: `Chrome не ответил на Input.dispatchMouseEvent за 30000 мс`. Занятый главный поток страницы иначе вешал пробу молча до таймаута обёртки. `evaluate( code, limit )` отдаёт свой `limit` в `send` и падает текстом `Страница не ответила за … мс`.

## Пример

`bog/myapp/probe/probe.node.ts`:

```ts
namespace $ {
	export async function $bog_myapp_probe_check( root = $node.process.cwd() ) {
		const got = await $bog_probe_rects({
			root,
			page: 'bog/myapp/app/-/index.html',
			ready: `typeof $ !== 'undefined' && !!document.querySelector( '[bog_myapp_app_menu]' )`,
			width: 400,
			selectors: [ '[bog_myapp_app_menu]', '[bog_myapp_app_body]' ],
		})
		const say = ( line: string )=> { $node.fs.writeSync( 1, line + '\n' ); return line }
		if( got === $bog_probe_skip ) return say( $bog_probe_skip )
		if( !$bog_probe_fits( got ) ) return $mol_fail( new Error( `прокрутка ${ got.scroll.width } > ${ got.viewport.width }` ) )
		if( !$bog_probe_beside( got.rects[ '[bog_myapp_app_menu]' ], got.rects[ '[bog_myapp_app_body]' ] ) ) return $mol_fail( new Error( 'меню наехало на текст' ) )
		return say( 'вёрстка в порядке' )
	}
}
```

`bog/myapp/probe/probe.node.test.ts`:

```ts
namespace $ {
	$mol_test({
		'layout holds at 400'() {
			const out = $bog_probe_test( 'bog/myapp/probe/-/node.js', 'bog_myapp_probe_check' )
			$mol_assert_ok( out.includes( $bog_probe_skip ) || out.includes( 'вёрстка в порядке' ) )
		},
	})
}
```

Модуль пробы держат отдельно от приложения: тест из корня пака едет в `node.test.js` каждого потребителя, а в чистом CI собранного `-/` нет.

Запуск:

```bash
npx mam bog/myapp/app
npx mam bog/myapp/probe
node bog/myapp/probe/-/node.test.js
```

## Требования

- Node 22+ (глобальные `fetch` и `WebSocket`).
- Chrome или Chromium: ищется по `CHROME_BIN`, `CHROME_PATH`, стандартным путям macOS и Linux, затем в `PATH`. Без него проба возвращает `$bog_probe_skip`, тест остаётся зелёным.
- Собранный `-/index.html` и `-/web.js` приложения, сервер отдаёт их из корня MAM.
