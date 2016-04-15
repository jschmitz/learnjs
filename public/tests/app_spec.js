describe('LeanJS', function() {
  'use strict';

  it('invokes the router when loaded', function() {
    spyOn(learnjs, 'showView');
    learnjs.appOnReady();
    expect(learnjs.showView).toHaveBeenCalledWith(window.location.hash);
  });

  it('subscribes to the hash change event', function() {
    learnjs.appOnReady();
    spyOn(learnjs, 'showView');
    $(window).trigger('hashchange');
    expect(learnjs.showView).toHaveBeenCalledWith(window.location.hash);
  });

  it('can show a problem view', function() {
    learnjs.showView('#problem-1');
    expect($('.view-container .problem-view').length).toEqual(1);
  });

  it('shows a landing view when there is no hash', function() {
    learnjs.showView('');
    expect($('.view-container .landing-view').length).toEqual(1);
  });

  it('has a template view', function() {
    expect($('.templates').length).toEqual(1);
  });

  it('passes the hash view parameter to the view function', function() {
    spyOn(learnjs, 'problemView');
    learnjs.showView('#problem-42');
    expect(learnjs.problemView).toHaveBeenCalledWith('42');
  });

  it('show link to finished on last correct answer in problem set', function() {
    var view = learnjs.problemView('2');
    view.find('.answer').val('7');
    view.find('.check-btn').click();
    expect(view.find('.result .correct-flash a').text()).toEqual("You're Finished!");
  });

  describe('problem view', function() {
    var view;

    beforeEach(function() {
      view = learnjs.problemView('1');
    });

    it('has a title that includes the problem number', function() {
      expect(view.find('.title').text()).toEqual('Problem #1');
    });

    it('shows a description and code snippet', function() {
      expect(view.find('p').text()).toEqual('What is the truth?');
    });

    it('shows a description and code snippet', function() {
      expect(view.find('pre code').text()).toEqual('function problem() { return _; }');
    });

    describe('answer section', function() {
      it('can check a correct answer by clicking a button', function() {
        view.find('.answer').val('true');
        view.find('.check-btn').click();
        expect(view.find('.result span').text()).toEqual('Correct!');
      });

      it('show link to next problem when correct', function() {
        view.find('.answer').val('true');
        view.find('.check-btn').click();
        expect(view.find('.result .correct-flash a').text()).toEqual('Next Problem');
      });


      it('rejects an incorrect answer', function() {
        view.find('.answer').val('false');
        view.find('.check-btn').click();
        expect(view.find('.result').text()).toEqual('Incorrect!');
      });
    });
  });
});
