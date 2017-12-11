var app = {
    manufacturer: '',
    dataService: '',
    apiUrl: 'http://export-app.de/api/?q=list',
    letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
    db: null,
    pdf: [],
    isDbReady: false,
    initialize: function () {
        this.bindEvents();
    },
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        //window.addEventListener('load', this.onDeviceReady, false);


        var wordsContainer = $('#words');
        $('#words, #detailsContainer').on('click', 'div.description a', function (e) {
            e.stopPropagation();
            var link = $(this).attr('href');
            if (link.indexOf('/details/') == 0) {
                var id = parseInt(link.substring(9));
                app.openDetails(id);
                return false;
            }
        });

        wordsContainer.on('click', 'div.links a', function (e) {
            e.stopPropagation();
        });

        wordsContainer.on('click', 'div.links a.externalLink', function (e) {
            e.preventDefault();
            app.dataService = e.target.href;


            var message = 'Diese Funktion ist nur in der Web-Version der Export-App verfügbar. Möchten Sie die Web-Version im Browser öffnen?';
            navigator.notification.confirm(
                message, // message
                app.onConfirm,            // callback to invoke with index of button pressed
                'Bestätigung',           // title
                ['Ok', 'Zurück']     // buttonLabels
            );
        });
        $("li.lightblue a").click(function () {
            $(this).next("ul .sub-menu").toggle();
        });

        $(document).on('click', 'p a.pdf', function (e) {
            e.preventDefault();
            console.log('works');
            app.openPdf(this.href)
        });
        function success() {
            console.log('Success');
        }

        function error(code) {
            if (code === 1) {
                console.log('No file handler found', code);
            } else {
                console.log('Undefined error', code);
            }
        }


        $('#letters').on('click', '.letter', function () {
            var letterId = $(this).data('letterid');
            app.updateView(letterId);
            app.openPage('.page#list');
        });

        wordsContainer.on('click', '.moreInfo', function () {
            var id = $(this).data('id');
            app.openDetails(id);
        });

        $('#detailsContainer').on('click', '#detailsBack', function () {
            app.openPage('.page#list');
            window.scrollTo(0, 0);
        });

        var searchForm = $('#searchForm');

        searchForm.on('submit', function () {
            var input = $(this).find('#searchInput');
            var search = input.val();
            app.updateView('', search);
            input.blur();
            app.openPage('.page#list');
            return false;
        });

        searchForm.on('change', '#searchInput', function () {
            if ($(this).val() == '') {
                app.updateView();
                $(this).blur();
            }
        });

        var newWordForm = $('#newWord');

        newWordForm.on('submit', function () {
            var input = $(this).find('input[name=newWord]');
            var value = input.val();
            $.ajax({
                type: 'POST',
                url: app.apiUrl + '/send_email.php',
                data: "content=" + value,
                success: function (data) {
                    alert("Vielen Dank für Ihren Hinweis. Wir werden diesen gerne bearbeiten.");
                    input.val('');
                    input.blur();
                },
                error: function (xhr, str) {
                    alert("Verbindungsfehler");
                }
            });
            return false;
        });

        $('body').on('click', '.externalLink', function (e) {
            e.preventDefault();
            app.dataService = e.target.href;

            var message = 'Diese Funktion ist nur in der Web-Version der Export-App verfügbar. Möchten Sie die Web-Version im Browser öffnen?';
            return navigator.notification.confirm(
                message, // message
                app.onConfirm,            // callback to invoke with index of button pressed
                'Bestätigung',           // title
                ['Ok', 'Zurück']     // buttonLabels
            );
        });
        // $('body').on('click', '.pdf',  function (e) {
        //     e.preventDefault();
        //     console.log(e.target.href);
        //     cordova.plugins.disusered.open(e.target.href, success, error);
        //
        // });

    },
    onConfirm: function (buttonIndex) {
        if (buttonIndex != 1) {
            return false;
        } else {
            window.open(app.dataService, "_system");
        }
    },
    onDeviceReady: function () {
        app.initDb();
        app.manufacturer = device.manufacturer;
        $('body').removeClass('hidden');
    },

    openPage: function (pageSelector) {
        $('.page').addClass('hidden');
        $(pageSelector).removeClass('hidden');
    },

    initDb: function () {
        this.db = window.openDatabase("words", "1.0", "Words DB", 20 * 1024 * 1024);

        this.db.transaction(function (tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS words (id INTEGER PRIMARY KEY, title, desc_short, desc_full, letter, youtube, video, partner, external_link,pdf)');
            tx.executeSql('CREATE TABLE IF NOT EXISTS settings (name PRIMARY KEY, value)');
        }, function (tx, err) {
            tx.executeSql('DROP TABLE IF EXISTS words');
            console.log('db error ' + err);
            app.initDb();
        }, function () {
            app.isDbReady = true;
            if (navigator.connection.type != 'none') {
                app.updateDb();
            }
            app.updateView();
        });
    },

    updateDb: function () {
        if (!app.isDbReady) {
            return;
        }
        var time = 0;
        app.db.transaction(function (tx) {//deleted tx from context
            tx.executeSql('SELECT value FROM settings WHERE name=?', ['last_updated'], function (tx, lastUpdated) {
                // console.log(lastUpdated.rows.item(0).value);
                if (lastUpdated.rows.length) {
                    time = lastUpdated.rows.item(0).value || 0;
                }
            });
        }, function (tx, err) {
            console.log('db error ' + err);
        }, function () {
            $.ajax({
                url: app.apiUrl,
                type: 'post',
                data: { time: 0 },
                dataType: 'json',
                success: function (data) {
                    var currentDate = new Date().getTime() - time;

                    // console.log(currentDate);
                    if (currentDate >= 3600) {
                        app.db.transaction(function (tx) {
                            if (data.words.length > 0) {
                                // tx.executeSql('CREATE TABLE IF NOT EXISTS wordstmp (id INTEGER PRIMARY KEY, title, desc_short, desc_full, letter, youtube, video, partner, external_link,pdf)');
                                // tx.executeSql('DELETE FROM wordstmp');
                                // tx.executeSql('INSERT INTO wordstmp SELECT * FROM words');
                                tx.executeSql('DROP TABLE IF EXISTS words');
                                tx.executeSql('CREATE TABLE IF NOT EXISTS words (id INTEGER PRIMARY KEY, title, desc_short, desc_full, letter, youtube, video, partner, external_link,pdf)');
                            }
                            for (var i in data.words) {
                                if (!!data.words[i].youtube && !data.words[i].external_link) {
                                    var link = data.words[i].youtube;
                                    var cornerlink = link.substr(38, 41);
                                    data.words[i].external_link = cornerlink;
                                }
                                if (data.words[i].pdf.length) {
                                    for (var j = 0; j < data.words[i].pdf.length; j++) {
                                        app.pdf.push(data.words[i].pdf[j].url)
                                    }

                                }
                                // if(data.words[i].id==307)console.log(data.words[i]);
                                var insert = [
                                    data.words[i].id,
                                    data.words[i].exportlexikon_headline,
                                    data.words[i].exportlexikon_kurztext,
                                    data.words[i].exportlexikon_text,
                                    data.words[i].exportlexikon_schreiben,
                                    data.words[i].youtube,
                                    data.words[i].video,
                                    data.words[i].partner,
                                    data.words[i].external_link,
                                    JSON.stringify(data.words[i].pdf)
                                ];
                                tx.executeSql('INSERT OR REPLACE INTO words (id, title, desc_short, desc_full, letter, youtube, video, partner, external_link,pdf) VALUES(?,?,?,?,?,?,?,?,?,?)', insert);
                            }
                            var currentTime = new Date().getTime();
                            tx.executeSql('INSERT OR REPLACE INTO settings (name, value) VALUES(?, ?)', ['last_updated', currentTime.toString()]);
                            tx.executeSql('DROP TABLE IF EXISTS wordstmp');
                        }, function (tx, err) {
                            console.log('db error ' + err);
                            tx.executeSql('DELETE FROM words');
                            tx.executeSql('INSERT INTO words SELECT * FROM wordstmp');
                            /*need to add info about err with update db*/
                        }, function (tx) {

                            window.plugins.toast.showLongTop('Die Datenbank wurde upgedatet.');
                            app.updateView();
                        })
                    }
                },
                error: function (e, err) {
                    window.plugins.toast.showShortTop('Ein Fehler ist w&auml;hrend dem Update der Datenbank aufgekommen.');
                }
            });
        });
    },

    updateView: function (letter, search) {
        if (!app.isDbReady) {
            return;
        }

        letter = letter || "0";
        search = search || '';
        if (search) {
            letter = '';
        }
        this.db.transaction(function (tx) {
            tx.executeSql('SELECT DISTINCT letter FROM words ORDER BY CAST(letter AS UNSIGNED)', [], function (tx, data) {
                var lettersContainer = $('#letters');
                lettersContainer.html('');
                if (data.rows.length) {
                    for (var i = 0; i < data.rows.length; i++) {
                        if (typeof data.rows.item(i) === 'object') {
                            var letterBlock = $('<span data-letterid="' + data.rows.item(i).letter + '" class="letter">' + app.letters[data.rows.item(i).letter] + '</span>');
                            if (data.rows.item(i).letter == letter) {
                                letterBlock.addClass('active');
                            }
                            lettersContainer.append(letterBlock);
                        }
                    }
                }
            });
        });

        this.db.transaction(function (tx) {
            var query;
            var param;
            if (search) {
                query = 'SELECT * FROM words WHERE title LIKE ? ORDER BY REPLACE(REPLACE(REPLACE(LOWER(title), "ä", "a"), "ö", "o"), "ü", "u")';
                param = '%' + search.toString() + '%';
            } else {
                query = 'SELECT * FROM words WHERE letter = ? ORDER BY REPLACE(REPLACE(REPLACE(LOWER(title), "ä", "a"), "ö", "o"), "ü", "u")';
                param = letter.toString();
            }
            tx.executeSql(query, [param],
                function (tx, data) {
                    if (data.rows.length) {
                        $.get('views/_wordItem.html', function (template) {
                            $('#words').html('');
                            for (var i = 0; i < data.rows.length; i++) {
                                if (data.rows.item(i).id) {
                                    var block = $(template).clone();
                                    var item = data.rows.item(i);
                                    block.find('div.title').text(item.title);
                                    block.find('div.description').html(item.desc_short);
                                    if (item.external_link) {
                                        block.find('div.links').append($('<a href="' + item.external_link + '" class="externalLink">Video</a>'));
                                    }

                                    block.data('id', item.id);
                                    $('#words').append(block);
                                }
                            }
                        });
                    } else {
                        $('#words').html('<div class="search-error"><b>Zu Ihrem Suchbegriff wurden keine Inhalte gefunden. Bei Fragen k&ouml;nnen Sie sich gerne an uns wenden.<br/>' +
                            'E-Mail: <a href="mailto:info@ihk-exportakademie.de">info@ihk-exportakademie.de</a><br/>' +
                            'Telefon: 0711 2005-1364</b></div>');
                    }
                });
        }, function (tx, err) {
            console.log('db error ' + err);
        });
    },
    openPdf: function (url) {
        // e.preventDefault();
        function pdfSuccess() {
            console.log('Success');
        }

        function pdfError(code) {
            if (code === 1) {
                console.log('No file handler found');
            } else {
                console.log('Undefined error', code);
            }
        }
        console.log(url)
        cordova.plugins.disusered.open(url, pdfSuccess, pdfError)
    },

    openDetails: function (id) {
        if (!app.isDbReady) {
            return;
        }

        this.db.transaction(function (tx) {
            tx.executeSql('SELECT * FROM words WHERE id = ?', [id],
                function (tx, data) {
                    //console.log(data);
                    if (data.rows.length) {
                        var word = data.rows.item(0);
                        console.log('without replace');
                        $.get('views/_wordDetails.html', function (template) {
                            var detailsContainer = $('#details');
                            detailsContainer.html('');
                            var block = $(template).clone();
                            block.find('div#detailsTitle').text(word.title);
                            block.find('div#detailsDesc').html(word.desc_short);

                            block.find('div#detailsDescFull').html(word.desc_full);
                            console.log(word);
                            if (JSON.parse(word.pdf).length > 0) {
                                // console.log(word.pdf);
                                var pdfArr = JSON.parse(word.pdf);
                                console.log(pdfArr);
                                // var pdfLinks = word.pdf.split(',');

                                for (var i = 0; i < pdfArr.length; i++) {
                                    // block.find('div#pdf').append($('<p><a class="pdf" href="'+encodeURI(pdfArr[i].url)+'">' + pdfArr[i].name + '</a></p>'));
                                    block.find('div#pdf').append($('<p><a class="pdf" href="' + pdfArr[i].url + '">' + pdfArr[i].name + '</a></p>'));
                                }

                            }
                            if (word.external_link) {
                                block.find('div.links').append($('<a href="' + word.external_link + '" class="externalLink">Video</a>'));
                            }
                            block.find('div.back>a').button();
                            detailsContainer.append(block);
                            app.openPage('.page#detailsContainer');
                            window.scrollTo(0, 0);
                        });

                    }
                });
        }
        );
    }
};

app.initialize();