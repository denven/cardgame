// convert canvas to image
const convertCanvasToImage = (targetId) => {
  const drawing = $(`#${targetId} canvas`)[0];
  if (drawing) {
    const context = drawing.getContext('2d');
    const imageURL = drawing.toDataURL("image/png");
    const image = document.createElement("img");
    image.src = imageURL;
    $('#qrcode').html(image);
  }
};

const getSelectElements = (targetId) => {
  let targetEle = $(`#${targetId} img`)[0];
  if (window.getSelection) {
    //For chrome etc.
    let selection = window.getSelection();
    let range = document.createRange();
    range.selectNode(targetEle);
    selection.removeAllRanges();
    selection.addRange(range);
  } else if (document.body.createTextRange) {
    // For IE
    let range = document.body.createTextRange();
    range.moveToElementText(targetEle);
    range.select();
  }
};

$('.qrcode-copy-button').click(e => {
  convertCanvasToImage('qrcode');
  getSelectElements('qrcode');
  document.execCommand('copy');
  window.getSelection().removeAllRanges();

  showCopyInfo();
});

$('.linkurl-copy-button').click(() => {
  const elem = document.createElement('textarea');
  // link url is added into title attribute
  elem.value = $("#qrcode").attr('title');
  document.body.appendChild(elem);
  elem.select();
  document.execCommand('copy');
  document.body.removeChild(elem);

  showCopyInfo();
});
