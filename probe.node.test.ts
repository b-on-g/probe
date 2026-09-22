namespace $ {

	const box = ( left: number, top: number, width: number, height: number ): $bog_probe_rect => ({
		left, top, width, height, right: left + width, bottom: top + height,
	})

	$mol_test({

		'aligned compares one edge within tolerance'() {
			$mol_assert_ok( $bog_probe_aligned( box( 0, 10, 100, 50 ), box( 200, 10.5, 100, 50 ), 'top' ) )
			$mol_assert_ok( $bog_probe_aligned( box( 0, 10, 100, 50 ), box( 200, 13, 100, 50 ), 'top', 3 ) )
			$mol_assert_not( $bog_probe_aligned( box( 0, 10, 100, 50 ), box( 200, 13, 100, 50 ), 'top' ) )
			$mol_assert_ok( $bog_probe_aligned( box( 0, 0, 100, 50 ), box( 0, 100, 100, 50 ), 'left' ) )
			$mol_assert_ok( $bog_probe_aligned( box( 0, 0, 100, 50 ), box( 300, 0, 100, 50 ), 'bottom' ) )
			$mol_assert_not( $bog_probe_aligned( box( 0, 0, 100, 50 ), box( 300, 0, 120, 50 ), 'right' ) )
			$mol_assert_not( $bog_probe_aligned( null, box( 0, 0, 1, 1 ), 'top' ) )
		},

		'beside needs the right box after the left one with vertical overlap'() {
			$mol_assert_ok( $bog_probe_beside( box( 0, 0, 100, 50 ), box( 100, 0, 100, 50 ) ) )
			$mol_assert_ok( $bog_probe_beside( box( 0, 0, 100, 50 ), box( 120, 40, 100, 50 ) ) )
			$mol_assert_ok( $bog_probe_beside( box( 0, 0, 100, 50 ), box( 120, 0, 100, 50 ), 20 ) )
			$mol_assert_not( $bog_probe_beside( box( 0, 0, 100, 50 ), box( 121, 0, 100, 50 ), 20 ) )
			$mol_assert_not( $bog_probe_beside( box( 0, 0, 100, 50 ), box( 90, 0, 100, 50 ) ) )
			$mol_assert_not( $bog_probe_beside( box( 0, 0, 100, 50 ), box( 100, 50, 100, 50 ) ) )
			$mol_assert_not( $bog_probe_beside( box( 100, 0, 100, 50 ), box( 0, 0, 100, 50 ) ) )
			$mol_assert_not( $bog_probe_beside( box( 0, 0, 100, 50 ), null ) )
		},

		'inside holds when every edge of the box stays within the outer one'() {
			$mol_assert_ok( $bog_probe_inside( box( 10, 10, 20, 20 ), box( 0, 0, 100, 100 ) ) )
			$mol_assert_ok( $bog_probe_inside( box( 0, 0, 100, 100 ), box( 0, 0, 100, 100 ) ) )
			$mol_assert_not( $bog_probe_inside( box( 90, 10, 20, 20 ), box( 0, 0, 100, 100 ) ) )
			$mol_assert_not( $bog_probe_inside( box( -1, 10, 20, 20 ), box( 0, 0, 100, 100 ) ) )
			$mol_assert_not( $bog_probe_inside( null, box( 0, 0, 100, 100 ) ) )
		},

		'fits means no horizontal scroll'() {
			const result = ( scroll: number, viewport: number ): $bog_probe_rects_result => ({
				rects: {},
				viewport: { width: viewport, height: 800 },
				scroll: { width: scroll, height: 2000 },
			})
			$mol_assert_ok( $bog_probe_fits( result( 400, 400 ) ) )
			$mol_assert_ok( $bog_probe_fits( result( 380, 400 ) ) )
			$mol_assert_not( $bog_probe_fits( result( 401, 400 ) ) )
		},

		'a key carries text only when it types something'() {
			$mol_assert_equal( $bog_probe_text( 'Enter' ), '\r' )
			$mol_assert_equal( $bog_probe_text( 'a' ), 'a' )
			$mol_assert_equal( $bog_probe_text( 'Я' ), 'Я' )
			$mol_assert_equal( $bog_probe_text( ' ' ), ' ' )
			$mol_assert_equal( $bog_probe_text( 'Escape' ), '' )
			$mol_assert_equal( $bog_probe_text( 'Tab' ), '' )
			$mol_assert_equal( $bog_probe_text( 'ArrowLeft' ), '' )
		},

		'a key names the physical code pages read by'() {
			$mol_assert_equal( $bog_probe_code( 'h' ), 'KeyH' )
			$mol_assert_equal( $bog_probe_code( 'V' ), 'KeyV' )
			$mol_assert_equal( $bog_probe_code( '7' ), 'Digit7' )
			$mol_assert_equal( $bog_probe_code( ' ' ), 'Space' )
			$mol_assert_equal( $bog_probe_code( 'Enter' ), 'Enter' )
			$mol_assert_equal( $bog_probe_code( 'Escape' ), 'Escape' )
		},

		async 'a silent browser fails the command by its name and forgets it'() {
			const browser = new $bog_probe_browser( '', '' )
			const sent = [] as string[]
			browser.socket = { send: ( text: string )=> sent.push( text ) } as unknown as WebSocket
			browser.limit = 20

			const failed = async ( task: Promise< unknown > )=> {
				try { await task } catch( error ) { return ( error as Error ).message }
				return 'answered'
			}

			const first = await failed( browser.send( 'Input.dispatchMouseEvent', { type: 'mouseMoved' } ) )

			$mol_assert_ok( first.startsWith( 'Chrome не ответил на Input.dispatchMouseEvent за ' ) )
			$mol_assert_ok( first.endsWith( ': браузер тоже не отвечает' ) )

			const second = await failed( browser.evaluate( 'return 1', 30 ) )

			$mol_assert_ok( second.startsWith( 'Страница не ответила за ' ) )
			$mol_assert_ok( second.endsWith( ': браузер тоже не отвечает' ) )

			$mol_assert_equal( sent.filter( text => text.includes( $bog_probe_beat ) ).length, 2 )
			$mol_assert_equal( browser.waits.size, 0 )
			$mol_assert_equal( browser.fails.size, 0 )
		},

		async 'a busy page is waited out while the browser answers the heartbeat'() {
			const browser = new $bog_probe_browser( '', '' )
			const sent = [] as { id: number, method: string }[]

			browser.socket = { send: ( text: string )=> {
				const message = JSON.parse( text ) as { id: number, method: string }
				sent.push( message )
				if( message.method === $bog_probe_beat ) {
					setTimeout( ()=> browser.accept({ id: message.id, result: {} }), 1 )
				}
			} } as unknown as WebSocket

			const task = browser.evaluate( 'return 1', 20 )

			await new Promise( done => setTimeout( done, 120 ) )

			const call = sent.find( one => one.method === 'Runtime.evaluate' )!
			browser.accept({ id: call.id, result: { result: { value: 7 } } })

			$mol_assert_equal( await task, 7 )
			$mol_assert_ok( sent.filter( one => one.method === $bog_probe_beat ).length >= 1 )
		},

		async 'a slow machine stretches the waits instead of failing them'() {
			const browser = new $bog_probe_browser( '', '' )
			let answers = 0

			browser.socket = { send: ( text: string )=> {
				const message = JSON.parse( text ) as { id: number, method: string, params: { expression: string } }
				const asks = String( message.params?.expression ?? '' )
				const late = asks.includes( 'готово' ) && ++ answers < 3
				setTimeout( ()=> browser.accept({
					id: message.id,
					result: { result: { value: late ? false : ( asks.includes( 'return 1' ) ? 1 : true ) } },
				}), 1 )
			} } as unknown as WebSocket

			browser.stretch = 3

			const waited = await browser.until( 'готово', 40, 10 )

			$mol_assert_ok( waited >= 0 )
			$mol_assert_equal( browser.stretch, 3 )
		},

		async 'an answer in time settles the command'() {
			const browser = new $bog_probe_browser( '', '' )
			browser.limit = 200
			browser.socket = {
				send: ( text: string )=> {
					const { id } = JSON.parse( text )
					setTimeout( ()=> browser.accept({ id, result: { result: { value: 7 } } }), 5 )
				},
			} as unknown as WebSocket

			$mol_assert_equal( await browser.evaluate( 'return 7', 100 ), 7 )
			$mol_assert_equal( browser.waits.size, 0 )
			$mol_assert_equal( browser.fails.size, 0 )
		},

		async 'press puts the physical code and the typed text on the wire'() {
			const browser = new $bog_probe_browser( '', '' )
			const sent = [] as $bog_probe_message[]
			browser.socket = {
				send: ( text: string )=> {
					const message = JSON.parse( text ) as $bog_probe_message
					sent.push( message )
					browser.accept({ id: message.id, result: {} })
				},
			} as unknown as WebSocket

			await browser.press( 'h', 72 )
			await browser.press( 'Escape', 27 )

			$mol_assert_like(
				sent.map( ({ method, params })=> [ method, params?.type, params?.code, params?.text ?? null ] ),
				[
					[ 'Input.dispatchKeyEvent', 'keyDown', 'KeyH', 'h' ],
					[ 'Input.dispatchKeyEvent', 'keyUp', 'KeyH', null ],
					[ 'Input.dispatchKeyEvent', 'keyDown', 'Escape', null ],
					[ 'Input.dispatchKeyEvent', 'keyUp', 'Escape', null ],
				],
			)
		},

		'rects script asks for every selector and the page metrics'() {
			const script = $bog_probe_rects_script([ '[a]', '[b]' ])
			$mol_assert_ok( script.includes( '"[a]"' ) )
			$mol_assert_ok( script.includes( '"[b]"' ) )
			$mol_assert_ok( script.includes( 'getBoundingClientRect' ) )
			$mol_assert_ok( script.includes( 'scrollWidth' ) )
			$mol_assert_ok( script.includes( 'innerWidth' ) )
		},

	})

}
