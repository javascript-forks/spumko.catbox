// Load modules

var Lab = require('lab');
var Catbox = require('..');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;


describe('Client', function () {

    it('uses string engine', function (done) {

        var client = new Catbox.Client('../test/import');
        client.start(function (err) {

            expect(err).to.not.exist;

            var key = { id: 'x', segment: 'test' };
            client.set(key, '123', 1000, function (err) {

                expect(err).to.not.exist;

                client.get(key, function (err, result) {

                    expect(err).to.not.exist;
                    expect(result.item).to.equal('123');
                    done();
                });
            });
        });
    });

    it('uses prototype engine', function (done) {

        var Obj = require('./import');
        var client = new Catbox.Client(Obj);
        client.start(function (err) {

            expect(err).to.not.exist;

            var key = { id: 'x', segment: 'test' };
            client.set(key, '123', 1000, function (err) {

                expect(err).to.not.exist;

                client.get(key, function (err, result) {

                    expect(err).to.not.exist;
                    expect(result.item).to.equal('123');
                    done();
                });
            });
        });
    });

    it('uses object instance engine', function (done) {

        var Obj = require('./import');
        var client = new Catbox.Client(new Obj());
        client.start(function (err) {

            expect(err).to.not.exist;

            var key = { id: 'x', segment: 'test' };
            client.set(key, '123', 1000, function (err) {

                expect(err).to.not.exist;

                client.get(key, function (err, result) {

                    expect(err).to.not.exist;
                    expect(result.item).to.equal('123');
                    done();
                });
            });
        });
    });

    it('throws an error if using an unknown engine type', function (done) {

        var fn = function () {

            var client = new Catbox.Client('bob');
        };

        expect(fn).to.throw(Error);
        done();
    });

    it('errors when calling get on a bad connection', function (done) {

        var errorEngine = {
            start: function (callback) { callback(null); },
            stop: function () { },
            isReady: function () { return true; },
            validateSegmentName: function () { return null; },
            get: function (key, callback) { return callback(new Error('fail')); },
            set: function (key, value, ttl, callback) { return callback(new Error('fail')); },
            drop: function (key, callback) { return callback(new Error('fail')); }
        };

        var client = new Catbox.Client(errorEngine);
        var key = { id: 'x', segment: 'test' };
        client.get(key, function (err, result) {

            expect(err).to.exist;
            expect(err.message).to.equal('fail');
            done();
        });
    });

    describe('#start', function () {

        it('passes an error in the callback when one occurs', function (done) {

            var engine = {
                start: function (callback) {

                    callback(new Error());
                }
            };

            var client = new Catbox.Client(engine);
            client.start(function (err) {

                expect(err).to.exist;
                done();
            });
        });
    });

    describe('#get', function () {

        it('returns an error when the connection is not ready', function (done) {

            var engine = {
                start: function (callback) {

                    callback();
                },
                isReady: function () {

                    return false;
                }
            };

            var client = new Catbox.Client(engine);
            client.get('test', function (err) {

                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.equal('Disconnected');
                done();
            });
        });

        it('wraps the result with cached details', function (done) {

            var engine = {
                start: function (callback) {

                    callback();
                },
                isReady: function () {

                    return true;
                },
                get: function (key, callback) {

                    var result = {
                        item: 'test1',
                        stored: 'test2'
                    };

                    callback(null, result);
                }
            };

            var client = new Catbox.Client(engine);
            client.get({ id: 'id', segment: 'segment' }, function (err, cached) {

                expect(cached.item).to.equal('test1');
                expect(cached.stored).to.equal('test2');
                expect(cached.ttl).to.exist;
                done();
            });
        });

        it('returns nothing when item is not found', function (done) {

            var engine = {
                start: function (callback) {

                    callback();
                },
                isReady: function () {

                    return true;
                },
                get: function (key, callback) {

                    callback(null, null);
                }
            };

            var client = new Catbox.Client(engine);
            client.get({ id: 'id', segment: 'segment' }, function (err, cached) {

                expect(err).to.equal(null);
                expect(cached).to.equal(null);
                done();
            });
        });

        it('returns nothing when item is not found (undefined item)', function (done) {

            var engine = {
                start: function (callback) {

                    callback();
                },
                isReady: function () {

                    return true;
                },
                get: function (key, callback) {

                    callback(null, { item: undefined });
                }
            };

            var client = new Catbox.Client(engine);
            client.get({ id: 'id', segment: 'segment' }, function (err, cached) {

                expect(err).to.equal(null);
                expect(cached).to.equal(null);
                done();
            });
        });

        it('returns falsey items', function (done) {

            var engine = {
                start: function (callback) {

                    callback();
                },
                isReady: function () {

                    return true;
                },
                get: function (key, callback) {

                    callback(null, {
                        item: false,
                        stored: false
                    });
                }
            };

            var client = new Catbox.Client(engine);
            client.get({ id: 'id', segment: 'segment' }, function (err, cached) {

                expect(err).to.equal(null);
                expect(cached.item).to.equal(false);
                done();
            });
        });

        it('expires item', function (done) {

            var engine = {
                start: function (callback) {

                    callback();
                },
                isReady: function () {

                    return true;
                },
                get: function (key, callback) {

                    var result = {
                        item: 'test1',
                        stored: Date.now() - 100,
                        ttl: 50
                    };

                    callback(null, result);
                }
            };

            var client = new Catbox.Client(engine);
            client.get({ id: 'id', segment: 'segment' }, function (err, cached) {

                expect(err).to.equal(null);
                expect(cached).to.equal(null);
                done();
            });
        });

        it('errors on empty key', function (done) {

            var client = new Catbox.Client('../test/import');
            client.start(function (err) {

                expect(err).to.not.exist;

                client.get({}, function (err) {

                    expect(err).to.exist;
                    expect(err.message).to.equal('Invalid key');
                    done();
                });
            });
        });
    });

    describe('#set', function () {

        it('returns an error when the connection is not ready', function (done) {

            var engine = {
                start: function (callback) {

                    callback();
                },
                isReady: function () {

                    return false;
                }
            };

            var client = new Catbox.Client(engine);
            client.set('test', 'test', 'test', function (err) {

                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.equal('Disconnected');
                done();
            });
        });
    });

    describe('#drop', function () {

        it('calls the extension clients drop function', function (done) {

            var engine = {
                start: function (callback) {

                    callback();
                },
                isReady: function () {

                    return true;
                },
                drop: function (key, callback) {

                    callback(null, 'success');
                }
            };

            var client = new Catbox.Client(engine);
            client.drop({ id: 'id', segment: 'segment' }, function (err, result) {

                expect(result).to.equal('success');
                done();
            });
        });
    });
});
