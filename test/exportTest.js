var path = require('path');
var _ = require('lodash');
var assert = require('assert');
var stream = require('stream');

describe('Export', function() {
  var ExportCsv = require(path.join(__dirname, '..', 'index.js')).exporter;

  var data = [
    {
      id: 1,
      someString: 'blabla1',
      someDate: new Date('1995-01-01'),
      someNumber: 123,
      someBoolean: 1
    },
    {
      id: 2,
      someString: 'blabla2',
      someDate: new Date('1996-01-01'),
      someNumber: 456,
      someBoolean: 0
    },
    {
      id: 3,
      someString: 'blabla3',
      someDate: new Date('1997-01-01'),
      someNumber: 789,
      someBoolean: 1
    },
    {
      id: 4,
      someString: '',
      someDate: '',
      someNumber: null,
      someBoolean: null
    },
    {
      id: 5
    }
  ];

  var expectedResultLines = [
    '1;"blabla1";Sun Jan 01 1995 01:00:00 GMT+0100 (CET);123;1\n',
    '2;"blabla2";Mon Jan 01 1996 01:00:00 GMT+0100 (CET);456;0\n',
    '3;"blabla3";Wed Jan 01 1997 01:00:00 GMT+0100 (CET);789;1\n',
    '4;;;null;\n',
    '5;;;;\n'
  ];

  var expectedResult = `1;"blabla1";Sun Jan 01 1995 01:00:00 GMT+0100 (CET);123;1
2;"blabla2";Mon Jan 01 1996 01:00:00 GMT+0100 (CET);456;0
3;"blabla3";Wed Jan 01 1997 01:00:00 GMT+0100 (CET);789;1
4;;;null;
5;;;;
`;

  var options = {
    rowDelimiter: '\n',
    columns: [
      {name: 'id', type: 'number'},
      {name: 'someString', type: 'string'},
      {name: 'someDate', type: 'date'},
      {name: 'someNumber', type: 'number', nullable: true},
      {name: 'someBoolean', type: 'boolean'}
    ]
  };

  it('should transform json object into csv', function(done) {
    var exportCsv = new ExportCsv(options);
    var i = 0;

    var output = exportCsv.getOutput(function(line, cb) {
      assert.equal(line, expectedResultLines[i++], 'Returned csv string line should be correct');
      cb();
    });

    data.forEach(function(line) {
      exportCsv.write(line);
    });

    output
    .on('error', function(err) {
      assert(false, 'should not pass here');
    })
    .on('finish', function() {
      assert.equal(i, 5, 'Should have parsed all lines');
      done();
    });
    exportCsv.end();
  });

  it('input should be pipable', function(done) {
    var exportCsv = new ExportCsv(options);
    var i = 0;
    var inputStream = new stream.PassThrough({objectMode: true});

    var output = exportCsv.getOutput(function(line, cb) {
      assert.equal(line, expectedResultLines[i++], 'Returned csv string line should be correct');
      cb();
    });

    inputStream.pipe(exportCsv);

    data.forEach(function(line) {
      inputStream.write(line);
    });

    output
    .on('error', function(err) {
      assert(false, 'should not pass here');
    })
    .on('finish', function() {
      assert.equal(i, 5, 'Should have parsed all lines');
      done();
    });
    inputStream.end();
  });

  it('output should be pipable', function(done) {
    var exportCsv = new ExportCsv(options);
    var i = 0;
    var inputStream = new stream.PassThrough({objectMode: true});
    var sinkStream = new stream.Writable({objectMode: true});

    sinkStream._write = function (chunk, encoding, next) {
      assert.equal(chunk, expectedResultLines[i++], 'Returned csv line should be correct');
      next();
    };

    var output = exportCsv.getOutput();

    inputStream.pipe(exportCsv);
    output.pipe(sinkStream);

    data.forEach(function(line) {
      inputStream.write(line);
    });

    sinkStream
    .on('error', function(err) {
      assert(false, 'should not pass here');
    })
    .on('finish', function() {
      assert.equal(i, 5, 'Should have parsed all lines');
      done();
    });
    inputStream.end();
  });

  it('(streams as i/o) with showHeaders = true, first line should be the columns names', function(done) {
    options.showHeaders = true;
    var firstLine = true;
    var exportCsv = new ExportCsv(options);
    var i = 0;
    var inputStream = new stream.PassThrough({objectMode: true});
    var sinkStream = new stream.Writable({objectMode: true});

    sinkStream._write = function (chunk, encoding, next) {
      if (firstLine) {
        firstLine = false;
        assert.equal(chunk, 'id;someString;someDate;someNumber;someBoolean\n', 'First line should have headers');
      } else {
        assert.equal(chunk, expectedResultLines[i++], 'Returned csv string line should be correct');
      }
      next();
    };

    var output = exportCsv.getOutput();

    inputStream.pipe(exportCsv);
    output.pipe(sinkStream);

    data.forEach(function(line) {
      inputStream.write(line);
    });

    sinkStream
    .on('error', function(err) {
      assert(false, 'should not pass here');
    })
    .on('finish', function() {
      assert.equal(i, 5, 'Should have parsed all lines');
      done();
    });
    inputStream.end();
  });

  it('(objects as input) with showHeaders = true, first line should be the columns names', function(done) {
    options.showHeaders = true;
    var firstLine = true;
    var exportCsv = new ExportCsv(options);
    var i = 0;

    var output = exportCsv.getOutput(function(line, cb) {
      if (firstLine) {
        firstLine = false;
        assert.equal(line, 'id;someString;someDate;someNumber;someBoolean\n', 'First line should have headers');
      } else {
        assert.equal(line, expectedResultLines[i++], 'Returned csv string line should be correct');
      }
      cb();
    });

    data.forEach(function(line) {
      exportCsv.write(line);
    });

    output
    .on('error', function(err) {
      assert(false, 'should not pass here');
    })
    .on('finish', function() {
      assert.equal(i, 5, 'Should have parsed all lines');
      done();
    });
    exportCsv.end();
  });

  it('should work with streams even if the internal buffer get full', function(done) {
    options.showHeaders = false;
    var exportCsv = new ExportCsv(options);
    var i = 0;
    var y = -1;
    var inputStream = new stream.PassThrough({objectMode: true});
    var sinkStream = new stream.Writable({objectMode: true});

    sinkStream._write = function (chunk, encoding, next) {
      ++i
      if (++y > 4) {
        y = 0;
      }
      assert.equal(chunk, expectedResultLines[y], 'Returned csv line should be correct');
      next();
    };

    var output = exportCsv.getOutput();

    inputStream.pipe(exportCsv);
    output.pipe(sinkStream);

    var bigData = [];
    for (var z = 0; z < 40; ++z) {
      bigData.push(data);
    }
    bigData = _.flattenDeep(bigData);

    bigData.forEach(function(line) {
      inputStream.write(line);
    });

    sinkStream
    .on('error', function(err) {
      assert(false, 'should not pass here');
    })
    .on('finish', function() {
      assert.equal(i, 200, 'Should have parsed all lines');
      done();
    });
    inputStream.end();
  });

  it('should work with objects even if the internal buffer get full', function(done) {
    options.showHeaders = false;
    var exportCsv = new ExportCsv(options);
    var i = 0;
    var y = -1;

    var output = exportCsv.getOutput(function(line, cb) {
      ++i
      if (++y > 4) {
        y = 0;
      }
      assert.equal(line, expectedResultLines[y], 'Returned csv line should be correct');
      cb();
    });

    var bigData = [];
    for (var z = 0; z < 40; ++z) {
      bigData.push(data);
    }
    bigData = _.flattenDeep(bigData);

    bigData.forEach(function(line) {
      exportCsv.write(line);
    });

    output
    .on('error', function(err) {
      assert(false, 'should not pass here');
    })
    .on('finish', function() {
      assert.equal(i, 200, 'Should have parsed all lines');
      done();
    });
    exportCsv.end();
  });

  it('should handle backpressure', function(done) {
    options.showHeaders = false;
    var exportCsv = new ExportCsv(options);
    var couldPush = true;
    var i = 0;
    var y = 0;
    var inputStream = new stream.PassThrough({objectMode: true});
    var sinkStream = new stream.Writable({objectMode: true});

    var testTransform1 = new stream.Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        var dataChunk = chunk;
        var ok = true;
        while (dataChunk.length > 1000) {
          ok = this.push(dataChunk.slice(0, 1000));
          if (!ok) {
            couldPush = false;
          }
          ++i;
          dataChunk = dataChunk.slice(1000, dataChunk.length);
        }
        ++i;
        ok = this.push(dataChunk);
        if (!ok) {
          couldPush = false;
        }
        callback();
      }
    });

    var testTransform2 = new stream.Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        var dataChunk = chunk;
        var ok = true;
        while (dataChunk.length > 1000) {
          ok = this.push(dataChunk.slice(0, 1000));
          if (!ok) {
            couldPush = false;
          }
          ++y;
          dataChunk = dataChunk.slice(1000, dataChunk.length);
        }
        ++y;
        ok = this.push(dataChunk);
        if (!ok) {
          couldPush = false;
        }
        callback();
      }
    });

    sinkStream._write = function (chunk, encoding, next) {
      // do nothing
    };

    var output = exportCsv.getOutput();

    inputStream.pipe(testTransform1);
    testTransform1.pipe(testTransform2);
    testTransform2.pipe(exportCsv);
    output.pipe(sinkStream);

    var bigData = [];
    for (var z = 0; z < 100; ++z) {
      bigData.push(data);
    }
    bigData = _.flattenDeep(bigData);

    bigData.forEach(function(line) {
      inputStream.write(line);
    });

    sinkStream
    .on('error', function(err) {
      assert(false, 'should not pass here');
    })
    .on('finish', function() {
      assert(false, 'should not pass here');
    });
    inputStream.end();
    setTimeout(function() {
      assert(!couldPush, 'back pressure was not handled');
      assert(i > y, 'Previous stream should process more write call');
      done();
    }, 1000)
  });
});