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
