var learnjs = {
  poolId: 'us-east-1:b68a0d9d-8f7f-4d41-a0b4-2e9338b89a7d'
};

learnjs.identity = new $.Deferred();

learnjs.triggerEvent = function(name, args) {
  'use strict';

  $('.view-container>*').trigger(name, args);
};

learnjs.addProfileLink = function(profile) {
  'use strict';

  var link = learnjs.template('profile-link');
  link.find('a').text(profile.email);
  $('.signin-bar').prepend(link);
};

learnjs.appOnReady = function(){
  'use strict';

  window.onhashchange = function(){
    learnjs.showView(window.location.hash);
  };
  learnjs.showView(window.location.hash);
  learnjs.identity.done(learnjs.addProfileLink);
};

learnjs.problemView = function(data) {
  'use strict';

  var problemNumber = parseInt(data, 10);
  var view = $('.templates .problem-view').clone();
  var problemData = learnjs.problems[problemNumber -1];
  var resultFlash = view.find('.result');
  var answer = view.find('.answer');

  function checkAnswer() {
    var test = problemData.code.replace('_', answer.val()) + '; problem();';

    return eval(test);
  }

  function checkAnswerClick() {
    if(checkAnswer()){
      var correctFlash = learnjs.buildCorrectFlash(problemNumber);
      learnjs.flashElement(resultFlash, correctFlash);
      learnjs.saveAnswer(problemNumber, answer.val());
    } else {
      learnjs.flashElement(resultFlash.text('Incorrect!'));
    }
    return false;
  }

  learnjs.fetchAnswer(problemNumber).then(function(data) {

    if (data.Item) {
      answer.val(data.Item.answer);
    }
  });

  view.find('.check-btn').click(checkAnswerClick);
  view.find('.title').html('Problem #' + problemNumber);
  learnjs.applyObject(problemData, view);

  if (problemNumber < learnjs.problems.length) {
    var buttonItem = learnjs.template('skip-btn');
    buttonItem.find('a').attr('href', '#problem-' + (problemNumber + 1));
    $('.nav-list').append(buttonItem);
    view.bind('removingView', function() {
      buttonItem.remove();
    });
  }
  return view;
};

learnjs.landingView = function() {
  'use strict';

  return learnjs.template('landing-view');
};

learnjs.buildCorrectFlash = function (problemNum) {
  'use strict';

  var correctFlash = learnjs.template('correct-flash');
  var link = correctFlash.find('a');

  if (problemNum < learnjs.problems.length) {
    link.attr('href', '#problem-' + (problemNum +1));
  } else {
    link.attr('href', '');
    link.text("You're Finished!");
  }
  return correctFlash;
};

learnjs.profileView = function() {
  'use strict';

  var view = learnjs.template('profile-view');
  learnjs.identity.done(function(identity) {
    view.find('.email').text(identity.email);
  });

  return view;
};

learnjs.showView = function(hash) {
  'use strict';

  var routes = {
    '#problem': learnjs.problemView,
    '#profile': learnjs.profileView,
    '#': learnjs.landingView,
    '': learnjs.landingView
  };

  var hashParts = hash.split('-');
  var viewFn = routes[hashParts[0]];

  if(viewFn){
    learnjs.triggerEvent('removingView', []);
    $('.view-container').empty().append(viewFn(hashParts[1]));
  }
};

learnjs.applyObject = function(obj, elem) {
  'use strict';

  for (var key in obj) {
    elem.find('[data-name="' + key + '"]').text(obj[key]);
  }
};

learnjs.flashElement = function(elem, content) {
  'use strict';

  elem.fadeOut('fast', function() {
    elem.html(content);
    elem.fadeIn();
  });
};

learnjs.template = function(name) {
  'use strict';

  return $('.templates .' + name).clone();
};

learnjs.problems = [
  {
    description: "What is the truth?",
    code: "function problem() { return _; }"
  },
  {
    description: "Simple Math",
    code: "function problem() { return 42 === 6 * _; }"
  }
];

learnjs.awsRefresh = function() {
  'use strict';

  var deferred = new $.Deferred();

  AWS.config.credentials.refresh(function(err) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(AWS.config.credentials.identityId);
    }
  });
  return deferred.promise();
};

learnjs.sendDbRequest = function(req, retry) {
  'use strict';

  var promise = new $.Deferred();
  req.on('error', function(error) {
    if (error.code === "CredentialsError") {
      learnjs.identity.then(function(identity) {
        return identity.refresh().then(function() {
          return retry();
        }, function () {
          promise.reject(resp);
        });
      });
    } else {
      console.log(error);
      promise.reject(error);
    }
  });
  req.on('success', function(resp) {
    promise.resolve(resp.data);
  });
  req.send();

  return promise;
};

learnjs.saveAnswer = function(problemId, answer) {
  'use strict';

  return learnjs.identity.then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient();
    var item = {
      TableName: 'learnjs',
      Item: {
        userId: identity.id,
        problemId: problemId,
        answer: answer
      }
    };
    return learnjs.sendDbRequest(db.put(item), function() {
      return learnjs.saveAnswer(problemId, answer);
    });
  });
};

learnjs.fetchAnswer = function(problemId) {
  'use strict';

  return learnjs.identity.then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient();
    var item = {
      TableName: 'learnjs',
      Key: {
        userId: identity.id,
        problemId: problemId
      }
    };
    return learnjs.sendDbRequest(db.get(item), function() {
      return learnjs.fetchAnswer(problemId);
    });
  });
};

function googleSignIn(googleUser) {
  "use strict";

  var id_token = googleUser.getAuthResponse().id_token;

  AWS.config.update({
    region: 'us-east-1',
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: learnjs.poolId,
      Logins: {
        'accounts.google.com': id_token
      }
    })
  });

  function refresh(){
    return gapi.auth2.getInstance().signIn({
      prompt: 'login'
    }).then(function(userUpdate) {
      var creds = AWS.config.credentials;
      var newToken = userUpdate.getAuthResponse().id_token();
      creds.params.Logins['accounts.google.com'] = newToken;
      return learnjs.awsRefresh();
    });
  }

  learnjs.awsRefresh().then(function(id) {
    learnjs.identity.resolve({
      id: id,
      email: googleUser.getBasicProfile().getEmail(),
      refresh: refresh
    });
  });
}

function checkAnswerClick() {
  'use strict';

  if(checkAnswer()){
    var flashContent = learnjs.buildCorrectFlash(problemNumber);
    learnjs.flashElement(resultFlash, flashContent);
    learnjs.saveAnswer(problemNumber, answer.val());
  }else{
    learnjs.flashElement(resultFlash, 'Incorrect!');
  }
  return false;
}


