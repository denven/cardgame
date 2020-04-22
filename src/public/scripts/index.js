$(() => {
  $('.new-game-button').each(function() {
    $(this).click(() => {
      $.ajax({
        type: 'POST',
        url: '/games',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify({
          game_type: $(this).data('game')
        })
      })
        .done(data => {
          if (data.status === 'TOO_MANY_GAMES') return;
          if (data.uuid) window.location.href = `/games/${data.uuid}`;
        })
        .fail(err => console.log(err));
    });
  });

  $('.join-game-button').each(function() {
    $(this).click(() => {
      $.ajax({
        type: 'PUT',
        url: `/games/${$(this).data('uuid')}`
      })
        .done(data => {
          window.location.href = `/games/${data.uuid}`;
        })
        .fail(err => console.log(err));
    });
  });

  // For quick play
  $('#quck-join-button').click(() => {

    let uuid = window.location.pathname.split('/')[3];

    if (uuid) {
      $.ajax({
        type: 'POST',
        url: '/login',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify({username: 'Chengwen', password: '123'})
      })
        .done(data => {
          console.log('login sucessfully');
          setTimeout(() => {
            $.ajax({
              type: 'PUT',
              url: `/games/${uuid}`
            })
              .done(data => {
                window.location.href = `/games/${uuid}`;
              })
              .fail(err => console.log(err));
          }, 3000);
        })
        .fail(err => console.log('111111111111111111134', err));
    }
  });
});