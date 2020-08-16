$(() => {
	// add nav-switch for mobile/desktop view
	let viewModel = "desktop";
	const toogleNav = () => {
		let width = document.body.clientWidth;

		if (width > 720) {
			$(".mobile-nav").hide();
			$(".mobile-nav > div").hide();

			$(".desktop-nav").show();
			$(".desktop-nav > div").show();
		} else {
			$(".mobile-nav").show();
			$(".mobile-nav > div").show();

			$(".desktop-nav").hide();
			$(".desktop-nav > div").hide();
		}
	};

	toogleNav(); //
});
