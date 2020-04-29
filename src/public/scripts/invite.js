// convert canvas to image
const convertCanvasToImage = (targetId) => {
  const drawing = $(`#${targetId} canvas`)[0];
  if (drawing) {
    const context = drawing.getContext('2d');
    const imageURL = drawing.toDataURL("image/png"); // to base64 URL
    const image = document.createElement("img");
    image.src = imageURL;
    $(`#${targetId}`).html(image); // Insert to the node
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
  let elem = convertCanvasToImage('qrcode');
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
