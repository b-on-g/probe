namespace $ {

	export type $bog_probe_message = {
		readonly id?: number
		readonly method?: string
		readonly sessionId?: string
		readonly params?: { readonly [ key: string ]: unknown }
		readonly result?: { readonly [ key: string ]: unknown }
	}

	export type $bog_probe_rect = {
		readonly left: number
		readonly top: number
		readonly width: number
		readonly height: number
		readonly right: number
		readonly bottom: number
	}

	export type $bog_probe_size = {
		readonly width: number
		readonly height: number
	}

	export type $bog_probe_rects_result = {
		readonly rects: { readonly [ selector: string ]: $bog_probe_rect | null }
		readonly viewport: $bog_probe_size
		readonly scroll: $bog_probe_size
	}

	export type $bog_probe_opts = {
		readonly page: string
		readonly script: string
		readonly width?: number
		readonly height?: number
		readonly scale?: number
		readonly ready?: string
		readonly limit?: number
		readonly root?: string
		readonly flags?: readonly string[]
	}

	export type $bog_probe_rects_opts = Omit< $bog_probe_opts, 'script' > & {
		readonly selectors: readonly string[]
	}

	export const $bog_probe_skip = 'Chrome не найден, проба пропущена'

	/** Переменная окружения, которой прогон объявляет, что браузер здесь обязателен. */
	export const $bog_probe_need = 'CI'

	export function $bog_probe_needed( env = $node.process.env ) {
		return Boolean( env[ $bog_probe_need ] )
	}

	export function $bog_probe_done( out: string, ... oks: readonly string[] ) {

		if( out.includes( $bog_probe_skip ) ) {

			if( $bog_probe_needed() ) return $mol_fail( new Error(
				`Браузер объявлен обязательным переменной ${ $bog_probe_need }, а ${ $bog_probe_skip }:\n${ out }`
			) )

			$node.fs.writeSync( 1, `проба: пропущена, ${ $bog_probe_need } не объявлена\n` )

			return true
		}

		for( const ok of oks ) if( out.includes( ok ) ) return true

		return false
	}

	/** Потолок ожидания ответа страницы: за ним страница считается мёртвой, а не занятой. */
	export const $bog_probe_patience = 120000

	/** Вызов к процессу браузера, а не к странице: отвечает, даже когда отрисовщик задавлен. */
	export const $bog_probe_beat = 'Browser.getVersion'

	export const $bog_probe_beat_limit = 5000

	/** Круговой вызов пустышки на свободной машине, мс. По нему меряется, во сколько раз машина медленнее. */
	export const $bog_probe_stretch_base = 20

	/** Потолок растяжки ожиданий: дальше это уже не занятость, а поломка. */
	export const $bog_probe_stretch_max = 8

	export const $bog_probe_ready = `typeof $ !== 'undefined' && document.readyState === 'complete'`

	export function $bog_probe_text( key: string ) {
		if( key === 'Enter' ) return '\r'
		return key.length === 1 ? key : ''
	}

	export function $bog_probe_code( key: string ) {
		if( /^[a-z]$/i.test( key ) ) return 'Key' + key.toUpperCase()
		if( /^[0-9]$/.test( key ) ) return 'Digit' + key
		if( key === ' ' ) return 'Space'
		return key
	}

	export function $bog_probe_pause( ms: number ) {
		return new Promise< void >( done => setTimeout( done, ms ) )
	}

	export function $bog_probe_dig( source: unknown, ... path: readonly string[] ): unknown {
		let node: unknown = source
		for( const step of path ) {
			if( !node || typeof node !== 'object' ) return undefined
			node = ( node as { readonly [ key: string ]: unknown } )[ step ]
		}
		return node
	}

	export function $bog_probe_chrome_bin() {

		const env = $node.process.env

		const listed = [
			env[ 'CHROME_BIN' ],
			env[ 'CHROME_PATH' ],
			'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
			'/Applications/Chromium.app/Contents/MacOS/Chromium',
			'/usr/bin/google-chrome',
			'/usr/bin/google-chrome-stable',
			'/usr/bin/chromium',
			'/usr/bin/chromium-browser',
			'/opt/google/chrome/chrome',
		]

		for( const bin of listed ) {
			if( bin && $node.fs.existsSync( bin ) ) return String( bin )
		}

		for( const name of [ 'google-chrome', 'google-chrome-stable', 'chromium', 'chrome' ] ) {
			const found = $node[ 'child_process' ].spawnSync( 'command', [ '-v', name ], { encoding: 'utf8', shell: true } )
			const bin = String( found.stdout ?? '' ).trim().split( '\n' )[ 0 ] ?? ''
			if( bin && $node.fs.existsSync( bin ) ) return bin
		}

		return ''
	}

	export const $bog_probe_types: { readonly [ ext: string ]: string } = {
		'.html': 'text/html; charset=utf-8',
		'.js': 'text/javascript; charset=utf-8',
		'.mjs': 'text/javascript; charset=utf-8',
		'.css': 'text/css; charset=utf-8',
		'.json': 'application/json; charset=utf-8',
		'.tree': 'text/plain; charset=utf-8',
		'.map': 'application/json; charset=utf-8',
		'.md': 'text/markdown; charset=utf-8',
		'.svg': 'image/svg+xml',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.webp': 'image/webp',
		'.woff2': 'font/woff2',
		'.woff': 'font/woff',
		'.ttf': 'font/ttf',
	}

	export class $bog_probe_static {

		port = 0
		server

		constructor( readonly root = String( $node.path.resolve( '.' ) ) ) {

			this.server = $node.http.createServer( (
				req: InstanceType< $node['http']['IncomingMessage'] >,
				res: InstanceType< $node['http']['ServerResponse'] >,
			)=> {

				const rel = decodeURIComponent( String( req.url ?? '' ).split( '?' )[ 0 ] ?? '' )
				const file = String( $node.path.join( this.root, rel ) )

				if( !file.startsWith( this.root ) ) { res.writeHead( 403 ); res.end(); return }

				$node.fs.readFile( file, ( error: unknown, data: unknown )=> {
					if( error ) { res.writeHead( 404 ); res.end( 'нет ' + rel ); return }
					res.writeHead( 200, {
						'content-type': $bog_probe_types[ String( $node.path.extname( file ) ) ] ?? 'application/octet-stream',
					} )
					res.end( data )
				} )

			} )

		}

		async open() {
			await new Promise< void >( done => this.server.listen( 0, '127.0.0.1', done ) )
			this.port = Number( ( this.server.address() as { port: number } ).port )
			return this
		}

		close() {
			this.server.close()
		}

		uri( path: string ) {
			if( /^https?:\/\//.test( path ) ) return path
			return `http://127.0.0.1:${ this.port }${ path.startsWith( '/' ) ? '' : '/' }${ path }`
		}

	}

	export class $bog_probe_browser {

		child: ReturnType< typeof $node[ 'child_process' ][ 'spawn' ] > | null = null
		socket: WebSocket | null = null
		seq = 0
		waits = new Map< number, ( reply: $bog_probe_message )=> void >()
		fails = new Map< number, ( error: Error )=> void >()
		frames = new Set< string >()
		page = ''
		target = ''
		dropped = ''
		limit = 30000
		patience = $bog_probe_patience
		stretch = 1

		constructor( readonly bin: string, readonly profile: string, readonly flags: readonly string[] = [] ) {}

		async open() {

			this.child = $node[ 'child_process' ].spawn( this.bin, [
				'--headless=new',
				'--remote-debugging-port=0',
				`--user-data-dir=${ this.profile }`,
				'--no-first-run',
				'--no-default-browser-check',
				'--no-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--disable-extensions',
				'--hide-scrollbars',
				'--window-size=1400,900',
				... this.flags,
				'about:blank',
			], { stdio: 'ignore' } )

			const port = await this.port_of( String( $node.path.join( this.profile, 'DevToolsActivePort' ) ) )

			const version = await ( await fetch( `http://127.0.0.1:${ port }/json/version` ) ).json()
			const socket = new WebSocket( String( version.webSocketDebuggerUrl ) )
			this.socket = socket

			await new Promise< void >( done => { socket.onopen = ()=> done() } )

			socket.onmessage = event => this.accept( JSON.parse( String( event.data ) ) )
			socket.onclose = ()=> this.drop( 'сокет отладки закрыт' )

			const made = await this.send( 'Target.createTarget', { url: 'about:blank' } )
			this.target = String( $bog_probe_dig( made, 'result', 'targetId' ) )

			const bound = await this.send( 'Target.attachToTarget', { targetId: this.target, flatten: true } )
			this.page = String( $bog_probe_dig( bound, 'result', 'sessionId' ) )

			await this.send( 'Page.enable', {}, this.page )
			await this.send( 'Runtime.enable', {}, this.page )
			await this.send( 'Target.setAutoAttach', {
				autoAttach: true, waitForDebuggerOnStart: false, flatten: true,
			}, this.page )

			return this
		}

		async port_of( stamp: string ) {

			const started = Date.now()

			while( Date.now() - started < 30000 ) {
				if( $node.fs.existsSync( stamp ) ) {
					const line = String( $node.fs.readFileSync( stamp, 'utf8' ) ).split( '\n' )[ 0 ] ?? ''
					if( line.trim() ) return Number( line.trim() )
				}
				await $bog_probe_pause( 200 )
			}

			return $mol_fail( new Error( `Chrome не отдал порт отладки за ${ Date.now() - started } мс` ) )
		}

		accept( reply: $bog_probe_message ) {

			const id = reply.id

			if( id && this.waits.has( id ) ) {
				const done = this.waits.get( id )!
				this.waits.delete( id )
				this.fails.delete( id )
				done( reply )
				return
			}

			if( reply.method === 'Target.attachedToTarget' ) {
				const session = String( $bog_probe_dig( reply, 'params', 'sessionId' ) )
				this.frames.add( session )
				const spare = ( method: string, params: object = {} )=> this.send( method, params, session ).catch( ()=> null )
				spare( 'Runtime.enable' )
				spare( 'Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true } )
				spare( 'Runtime.runIfWaitingForDebugger' )
			}

			if( reply.method === 'Target.detachedFromTarget' ) {
				this.frames.delete( String( $bog_probe_dig( reply, 'params', 'sessionId' ) ) )
			}

		}

		drop( reason: string ) {
			this.dropped = reason
			const fails = [ ... this.fails.values() ]
			this.waits.clear()
			this.fails.clear()
			for( const fail of fails ) fail( new Error( reason ) )
		}

		send( method: string, params: object = {}, session = '', limit = this.limit, late = `Chrome не ответил на ${ method }` ) {

			const socket = this.socket
			if( !socket ) return Promise.reject( new Error( 'Браузер не открыт' ) )
			if( this.dropped ) return Promise.reject( new Error( this.dropped ) )

			const id = ++ this.seq
			const began = Date.now()
			const patience = Math.max( limit, this.patience )
			const alone = method === $bog_probe_beat

			return new Promise< $bog_probe_message >( ( done, fail )=> {

				let timer = null as ReturnType< typeof setTimeout > | null
				let settled = false

				const stop = ()=> {
					settled = true
					if( timer ) clearTimeout( timer )
				}

				const give = ( note: string )=> {
					if( settled ) return
					stop()
					this.waits.delete( id )
					this.fails.delete( id )
					fail( new Error( `${ late } за ${ Date.now() - began } мс${ note }` ) )
				}

				const watch = ()=> {
					timer = setTimeout( async ()=> {

						if( settled ) return

						if( alone || Date.now() - began >= patience ) {
							return give( alone ? '' : `, браузер жив, но страница молчит дольше ${ patience } мс` )
						}

						const beat = await this.send(
							$bog_probe_beat, {}, '', Math.min( $bog_probe_beat_limit, Math.max( 200, limit ) ),
						).then( ()=> true, ()=> false )

						if( settled ) return
						if( !beat ) return give( ': браузер тоже не отвечает' )

						watch()

					}, limit )
				}

				watch()

				this.waits.set( id, reply => { stop(); done( reply ) } )
				this.fails.set( id, error => { stop(); fail( error ) } )

				socket.send( JSON.stringify( session ? { id, method, params, sessionId: session } : { id, method, params } ) )

			} )

		}

		async viewport( width: number, height: number, scale = 1 ) {
			await this.send( 'Emulation.setDeviceMetricsOverride', {
				width, height, deviceScaleFactor: scale, mobile: width < 700,
			}, this.page )
		}

		async evaluate( code: string, limit: number, session = this.page ) {

			const reply = await this.send( 'Runtime.evaluate', {
				expression: `(async()=>{ ${ code } })()`,
				awaitPromise: true,
				returnByValue: true,
			}, session, limit, 'Страница не ответила' )

			const wrong = $bog_probe_dig( reply, 'result', 'exceptionDetails' )

			if( wrong ) return $mol_fail( new Error( 'Страница бросила: ' + String(
				$bog_probe_dig( wrong, 'exception', 'description' ) ?? $bog_probe_dig( wrong, 'text' )
			) ) )

			return $bog_probe_dig( reply, 'result', 'result', 'value' )
		}

		async shot( file: string ) {
			let data = ''
			let wrong = ''
			for( let attempt = 0; attempt < 3 && !data; ++ attempt ) {
				const reply = await this.send( 'Page.captureScreenshot', { format: 'png' }, this.page, this.limit, 'Скриншот не снялся' )
				data = String( $bog_probe_dig( reply, 'result', 'data' ) ?? '' )
				wrong = String( $bog_probe_dig( reply, 'error', 'message' ) ?? '' )
				if( !data ) await $bog_probe_pause( 1000 )
			}
			if( !data ) return $mol_fail( new Error( 'Скриншот пустой: ' + ( wrong || 'CDP не вернул data' ) ) )
			$node.fs.mkdirSync( $node.path.dirname( file ), { recursive: true } )
			$node.fs.writeFileSync( file, Buffer.from( data, 'base64' ) )
			return file
		}

		async until( code: string, limit: number, step = 300 ) {

			const began = Date.now()
			const guarded = `return (()=>{ try { return ( ${ code } ) } catch( error ) { return false } })()`

			for( let round = 0; round < 2; ++ round ) {

				const started = Date.now()
				const patient = limit * this.stretch

				while( Date.now() - started < patient ) {
					const got = await this.evaluate( guarded, Math.min( 15000, limit ) )
					if( got ) return Date.now() - began
					await $bog_probe_pause( step )
				}

				if( round ) break

				const before = this.stretch
				await this.gauge()
				if( this.stretch <= before ) break
			}

			return -1
		}

		/** Во сколько раз машина сейчас медленнее свободной: по нему растягиваются ожидания. */
		async gauge() {

			const times = [] as number[]

			for( let step = 0; step < 5; ++ step ) {
				const began = Date.now()
				await this.evaluate( 'return 1', 15000 )
				times.push( Date.now() - began )
			}

			times.sort( ( first, second )=> first - second )

			const middle = times[ Math.floor( times.length / 2 ) ] ?? $bog_probe_stretch_base

			this.stretch = Math.min(
				$bog_probe_stretch_max,
				Math.max( 1, Math.round( middle / $bog_probe_stretch_base ) ),
			)

			return this.stretch
		}

		async open_page( uri: string, ready = $bog_probe_ready, limit = 30000 ) {
			await this.send( 'Page.navigate', { url: uri }, this.page )
			const waited = await this.until( ready, limit )
			if( waited < 0 ) return $mol_fail( new Error(
				`Страница ${ uri } не готова за ${ limit * this.stretch } мс: ${ ready }`
			) )
			await this.gauge()
			return waited
		}

		async press( key: string, code: number ) {
			const text = $bog_probe_text( key )
			for( const type of [ 'keyDown', 'keyUp' ] ) {
				await this.send( 'Input.dispatchKeyEvent', {
					type, key, code: $bog_probe_code( key ), windowsVirtualKeyCode: code, nativeVirtualKeyCode: code,
					... text && type === 'keyDown' ? { text } : {},
				}, this.page )
			}
		}

		close() {
			try { this.socket?.close() } catch( error ) {}
			try { this.child?.kill( 'SIGKILL' ) } catch( error ) {}
		}

	}

	export async function $bog_probe_run( opts: $bog_probe_opts ): Promise< unknown > {

		const bin = $bog_probe_chrome_bin()
		if( !bin ) return $bog_probe_skip

		const root = String( $node.path.resolve( opts.root ?? $node.process.cwd() ) )
		const width = opts.width ?? 1280
		const height = opts.height ?? 800
		const limit = opts.limit ?? 30000

		const site = await new $bog_probe_static( root ).open()
		const profile = String( $node.fs.mkdtempSync( $node.path.join( $node.os.tmpdir(), 'bog-probe-' ) ) )
		const browser = new $bog_probe_browser( bin, profile, opts.flags )

		try {

			await browser.open()
			await browser.viewport( width, height, opts.scale )
			await browser.open_page( site.uri( opts.page ), opts.ready ?? $bog_probe_ready, limit )
			return await browser.evaluate( opts.script, limit )

		} finally {
			browser.close()
			site.close()
			try { $node.fs.rmSync( profile, { recursive: true, force: true } ) } catch( error ) {}
		}

	}

	export type $bog_probe_shot_opts = Omit< $bog_probe_opts, 'script' > & {
		readonly file: string
		readonly script?: string
	}

	export async function $bog_probe_shot( opts: $bog_probe_shot_opts ): Promise< string | typeof $bog_probe_skip > {

		const bin = $bog_probe_chrome_bin()
		if( !bin ) return $bog_probe_skip

		const root = String( $node.path.resolve( opts.root ?? $node.process.cwd() ) )
		const width = opts.width ?? 1280
		const height = opts.height ?? 800
		const limit = opts.limit ?? 30000

		const site = await new $bog_probe_static( root ).open()
		const profile = String( $node.fs.mkdtempSync( $node.path.join( $node.os.tmpdir(), 'bog-probe-' ) ) )
		const browser = new $bog_probe_browser( bin, profile, opts.flags )

		try {

			await browser.open()
			await browser.viewport( width, height, opts.scale )
			await browser.open_page( site.uri( opts.page ), opts.ready ?? $bog_probe_ready, limit )
			if( opts.script ) await browser.evaluate( opts.script, limit )
			return await browser.shot( opts.file )

		} finally {
			browser.close()
			site.close()
			try { $node.fs.rmSync( profile, { recursive: true, force: true } ) } catch( error ) {}
		}

	}

	export function $bog_probe_rects_script( selectors: readonly string[] ) {
		return `
			const rects = {}
			for( const selector of ${ JSON.stringify( selectors ) } ) {
				const node = document.querySelector( selector )
				if( !node ) { rects[ selector ] = null; continue }
				const box = node.getBoundingClientRect()
				rects[ selector ] = {
					left: box.left, top: box.top, width: box.width, height: box.height, right: box.right, bottom: box.bottom,
				}
			}
			const scroller = document.scrollingElement || document.documentElement
			return {
				rects,
				viewport: { width: innerWidth, height: innerHeight },
				scroll: { width: scroller.scrollWidth, height: scroller.scrollHeight },
			}
		`
	}

	export async function $bog_probe_rects( opts: $bog_probe_rects_opts ): Promise< $bog_probe_rects_result | typeof $bog_probe_skip > {
		const { selectors, ... rest } = opts
		const got = await $bog_probe_run({ ... rest, script: $bog_probe_rects_script( selectors ) })
		if( got === $bog_probe_skip ) return $bog_probe_skip
		return got as $bog_probe_rects_result
	}

	export function $bog_probe_test( bundle: string, fn: string, timeout = 300000 ) {

		const d = '$'
		const file = String( $node.path.resolve( bundle ) )

		if( !$node.fs.existsSync( file ) ) return $mol_fail( new Error( `Проба: нет ${ bundle }, модуль не собран` ) )

		const code = `
			const $ = require( ${ JSON.stringify( file ) } )
			Promise.resolve().then( ()=> $[ ${ JSON.stringify( d + fn ) } ]() ).then(
				()=> process.exit( 0 ),
				error => { process.stdout.write( 'проба упала: ' + String( ( error && error.stack ) || error ) + '\\n' ); process.exit( 1 ) },
			)
		`

		const run = $node[ 'child_process' ].spawnSync( $node.process.execPath, [ '-e', code ], {
			encoding: 'utf8',
			timeout,
			maxBuffer: 1 << 24,
			cwd: $node.process.cwd(),
		} )

		const out = String( run.stdout ?? '' ) + String( run.stderr ?? '' )

		$node.fs.writeSync( 1, out )

		if( run.status !== 0 ) return $mol_fail( new Error(
			`Проба ${ fn }: код ${ run.status }, сигнал ${ run.signal }\n${ out }`
		) )

		return out
	}

	export function $bog_probe_aligned(
		a: $bog_probe_rect | null,
		b: $bog_probe_rect | null,
		axis: 'top' | 'left' | 'bottom' | 'right',
		tolerance = 1,
	) {
		if( !a || !b ) return false
		return Math.abs( a[ axis ] - b[ axis ] ) <= tolerance
	}

	export function $bog_probe_beside( left: $bog_probe_rect | null, right: $bog_probe_rect | null, gap_max = Infinity ) {
		if( !left || !right ) return false
		if( right.left < left.right ) return false
		if( right.left - left.right > gap_max ) return false
		return left.top < right.bottom && right.top < left.bottom
	}

	export function $bog_probe_inside( box: $bog_probe_rect | null, outer: $bog_probe_rect | null ) {
		if( !box || !outer ) return false
		return box.left >= outer.left && box.top >= outer.top && box.right <= outer.right && box.bottom <= outer.bottom
	}

	export function $bog_probe_fits( result: $bog_probe_rects_result ) {
		return result.scroll.width <= result.viewport.width
	}

}
