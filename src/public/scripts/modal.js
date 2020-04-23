const openModal = (width = '40%', height = 'auto', title = 'Title', content = 'content') => {
  $("#myModal").css("display", "block");
  $(".modal-dialog").css("width", width);
  $(".modal-dialog").css("height", height);
  $(".modal-title").children('h4').text(title);
  $(".modal-body").children('p').text(content);
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