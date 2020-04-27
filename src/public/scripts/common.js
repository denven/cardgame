$(() => {
  // add nav-switch for mobile/desktop view
  const toogleNav = () => {
    let width = document.body.clientWidth;

    if (width < 720) {
      $('.desktop-nav div').css('display', 'none');
      $('.desktop-nav').css('display', 'none');
      $('.mobile-nav div').css('display', 'flex');
      $('.mobile-nav').css('display', 'flex');
    }
  };

  toogleNav();  //
});