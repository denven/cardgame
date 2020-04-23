const openModal = (width = '40%', height = 'auto', title = 'Information', content = 'content', showBtn = true) => {
  $("#myModal").css("display", "block");
  $(".modal-dialog").css("width", width);
  $(".modal-dialog").css("height", height);
  $("#modal-title-text").text(title);
  $(".modal-body").children('p').text(content);
  if (!showBtn) {
    $('.modal-copy-buttons').css('display', 'none');
  }
};

const showCopyInfo = () => {
  $('.show-result-info').css('visibility', 'visible');
  setTimeout(() => {
    $('.show-result-info').css('visibility', 'hidden');
  }, 1000);
};

$(".close").click(() => {
  $("#myModal").css("display", "none");
});

// When the user clicks anywhere outside of the modal, close it
$(window).click((event) => {
  if (event.target.id == "myModal") {
    $("#myModal").css("display", "none");
  }
});