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

			$mol_assert_equal(
				await failed( browser.send( 'Input.dispatchMouseEvent', { type: 'mouseMoved' } ) ),
				'Chrome не ответил на Input.dispatchMouseEvent за 20 мс',
			)
			$mol_assert_equal( await failed( browser.evaluate( 'return 1', 30 ) ), 'Страница не ответила за 30 мс' )
			$mol_assert_equal( sent.length, 2 )
			$mol_assert_equal( browser.waits.size, 0 )
			$mol_assert_equal( browser.fails.size, 0 )
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
