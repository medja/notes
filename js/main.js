window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

String.prototype.default = function(value) {
	return this == "" ? value : this;
}

String.prototype.escape = function() {
	return this.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
};

String.prototype.isNumeric = function() {
	return !isNaN(parseFloat(this)) && isFinite(this);
};

String.prototype.list = function() {
	if (delimiter == undefined) delimiter = ",";
	if (this.trim() == "") return [];
	return this.split(delimiter).map(function(item) {
		return item.trim();
	});
};

HTMLElement.prototype.insertAfter = function(element, target) {
	this.insertBefore(element, target.nextSibling);
};

HTMLElement.prototype.closest = function(selector) {
	var elements = Array.prototype.slice.call(document.querySelectorAll(selector));
	var element = this;
	while (element != null && elements.indexOf(element) < 0)
		element = element.parentElement;
	return element;
};

HTMLElement.prototype.index = function() {
	return Array.prototype.slice.call(this.parentElement.children).indexOf(this);
};

String.prototype.repeat = function(count) {
	return new Array(count + 1).join(this);
};

Number.prototype.format = function(length) {
	var value = this.toString();
	return ("0".repeat(Math.max(0, length - value.length)) + value).substr(-length);
};

Date.ISO = "YYYY-MM-DDTHH:mm:ssZ";

Date.prototype.format = function(format, utc) {
	if (utc == null) utc = format[format.length - 1] == "Z";
	var regex = /[YMDHhms]{1,4}/g;
	var time = format;
	while (match = regex.exec(format)) {
		var match = match[0],
		type = match[0];
		time = time.replace(match, (
			type == "Y" ? (utc ? this.getUTCFullYear() : this.getFullYear()) :
			type == "M" ? (utc ? this.getUTCMonth() : this.getMonth()) :
			type == "D" ? (utc ? this.getUTCDate() : this.getDate()) :
			type == "H" ? (utc ? this.getUTCHours() : this.getHours()) :
			type == "h" ? ((utc ? this.getUTCHours() : this.getHours()) - 1) % 12 + 1 :
			type == "m" ? (utc ? this.getUTCMinutes() : this.getMinutes()) :
			type == "s" ? (utc ? this.getUTCSeconds() : this.getSeconds()) :
			"").format(match.length));
	}
	return time;
};

if (!Array.prototype.findIndex) {
	Array.prototype.findIndex = function(callback, scope) {
		for (var i = this.length - 1; i >= 0; i--) {
			if (i in this && callback.call(scope, this[i], i, this)) {
				return i;
			}
		}
		return -1;
	};
}

(function() {
	var markdown = (function() {
		var parse = function(markdown) {
			var html = "";
			var debug = markdown[0] == "T";
			var matches = (markdown.replace(/\t/g, "    ") + "\n\n").match(/(.*\n)+?\n+/g);
			for (var i = 0; i < matches.length; i++) {
				var block = matches[i];
				if (block[0] === ">") {
					html += "<blockquote>" + parse(block.replace(
						/^(?:>|\s)?\s?/gm, "")) + "</blockquote>";
				} else if (match = /^(#{1,5})\s+(.*)\n/.exec(block)) {
					var tag = "h" + (match[1].length + 1);
					html += "<" + tag + ">" + inline(match[2]) + "</" + tag + ">";
				} else if (block.match(/^\s{4}/)) {
					html += "<code>" + block.trim()
						.replace(/^\s{4}/gm, "").escape() + "</code>";
				} else if (match = /^\s?(\*|\+|\-|\d+\.)\s/.exec(block)) {
					var tag, regex = match[0][0] === " " ? "\\s" : "";
					if (match[1][0].isNumeric()) {
						tag = "ol";
						regex += "\\d+\\.";
					} else {
						tag = "ul";
						regex += "[\\*\\+\\-]";
					};
					if (match[0][match[0].length - 1] === " ")
						regex += "\\s";
					html += "<" + tag + ">";
					var regexp = new RegExp(regex + "(.*\\n)+?(?=" + regex + "|$)", "g");
					while (item = regexp.exec(block)) {
						html += "<li>";
						if (match = new RegExp("^" + regex + "\\s*(.*?)\\n?\\s*$").exec(item[0])) {
							html += inline(match[1]);
						} else {
							var match = new RegExp("^"
								+ regex, "g").exec(item);
							html += parse(item[0].replace(
								new RegExp("^(?:" + regex
									+ "|\\s{0," + match[0].length + "})", "gm"), ""));
						};
						html += "</li>";
					};
					html += "</" + tag + ">";
				} else {
					html += "<p>" + inline(block) + "</p>";
				};
			};
			return html;
		},
		inline = function(markdown) {
			return markdown.trim().escape()
				.replace(/\s{2,}$/gm, "<br>")
				.replace(/(?:\*|\_){2}((?:.|\n)*?)(?:\*|\_){2}/g, "<strong>$1</strong>")
				.replace(/(?:\*|\_)((?:.|\n)*?)(?:\*|\_)/g, "<em>$1</em>")
				.replace(/`((?:.|\n)*?)`/g, "<code>$1</code>")
				.replace(/\!\[(.*?)\]\((.+?)(?:\s+&quot;(.*?)&quot;)?\)/g,
					"<img src=\"$2\" alt=\"$1\" title=\"$3\">")
				.replace(/\[(.*?)\]\((.+?)(?:\s+&quot;(.*?)&quot;)?\)/g,
					"<a href=\"$2\" title=\"$3\">$1</a>");
		};
		return parse;
	})();
	var app = function(db) {
		var aside = document.querySelector("aside"),
		note = document.querySelector("#note"),
		main = document.querySelector("main"),
		source = document.querySelector("#source textarea"),
		preview = document.querySelector("#preview"),
		title = document.querySelector("header input"),
		hover = 0, item, store = [], saving = false,
		display = function(note) {
			var index = Math.max(store.findIndex(function(time) {
				return time < note.time;
			}), 0);
			store.splice(index, 0, note.time);
			var element = document.createElement("article");
			var title = document.createElement("h1");
			title.innerHTML = note.title.escape();
			element.appendChild(title);
			var time = document.createElement("time");
			var date = new Date(note.time);
			time.setAttribute("datetime", date.format(Date.ISO));
			time.innerHTML = date.format("HH:mm DD/MM/YYYY");
			element.appendChild(time);
			aside.insertAfter(element, aside.children[index]);
		},
		fetch = function() {
			var update = {
				title: title.value.trim().default(title.placeholder),
				content: source.value,
				tags: []
			};
			if (item != null) update.id = item.id;
			return update;
		},
		inputs = function() {
			title.readOnly = window.innerWidth < 800 && !main.classList.contains("edit");
		},
		scroll = (function() {
			var ignore = false;
			return function(from, to) {
				ignore = !ignore;
				if (ignore) {
					to.scrollTop = from.scrollTop *
						(to.scrollHeight - to.clientHeight) /
						(from.scrollHeight - from.clientHeight);
				}
			};
		})();
		this.find = function(args, callback) {
			if (callback == undefined) {
				callback = args;
				args = null; }
			var list = [];
			var keys = args == null ? [] : Object.keys(args);
			db.transaction("notes").objectStore("notes").openCursor().onsuccess = function() {
				var cursor = event.target.result;
				if (cursor) {
					var item = cursor.value;
					keys.every(function(key) {
						return args[key] == item[key];
					}) && list.push(item);
					cursor.continue();
				} else callback.call(null, list);
			};
		};
		this.get = function(item, callback) {
			db.transaction("notes").objectStore("notes").get(item).onsuccess = function(event) {
				callback.call(null, event.target.result);
			};
		};
		this.add = function(item, callback) {
			item.time = item.time || new Date().getTime();
			item.id = item.id || item.time;
			db.transaction("notes", "readwrite").objectStore("notes").add(item).onsuccess = function() {
				display(item);
				if (callback != undefined) callback.call(null, item);
			};
		};
		this.remove = function(item, callback) {
			aside.children[store.indexOf(item) + 1].remove();
			store.splice(store.indexOf(item), 1);
			db.transaction("notes", "readwrite").objectStore("notes").delete(item).onsuccess = function() {
				if (callback != undefined) callback.call(null);
			};
		};
		this.update = function(item, update, callback) {
			this.remove(item, function() {
				this.add(update, callback);
			}.bind(this));
		};
		this.new = function() {
			item = null;
			title.value = "";
			source.value = "";
			preview.innerHTML = "";
			main.classList.add("edit");
			document.body.classList.add("open");
			note.innerHTML = "";
		};
		this.open = function(id) {
			this.get(id, function(note) {
				item = note;
				title.value = item.title;
				source.value = item.content;
				preview.innerHTML = markdown(item.content);
				document.body.classList.add("open");
				note.innerHTML = "";
			});
		};
		this.save = function(callback) {
			if (!saving) {
				saving = true;
				var complete = function(update) {
					item = update;
					saving = false;
					if (callback != undefined) callback.call(null, update);
				}.bind(this);
				if (item == null) {
					this.add(fetch(), complete);
				} else {
					this.update(item.time, fetch(), complete);
				}
			}
		};
		this.close = function() {
			main.classList.remove("edit");
			document.body.classList.remove("open");
		};
		this.import = function(notes) {
			if (notes instanceof String || !notes instanceof Object)
				notes = JSON.parse(notes);
			if (!notes instanceof Array) notes = [notes];
			notes.forEach(function(note) {
				this.add(note);
			}.bind(this));
		};
		this.export = function(id, callback) {
			if (callback == undefined) {
				callback = id;
				id = null; }
			if (id == null) {
				this.find(function(notes) {
					callback.call(null, JSON.stringify(notes));
				});
			} else {
				this.get(id, function(note) {
					callback.call(null, JSON.stringify(note));
				});
			}
		};
		aside.addEventListener("click", function(event) {
			if (event.target.nodeName == "H2")
				this.new();
			else if (element = event.target.closest("aside > *"))
				this.open(store[element.index() - 1]);
		}.bind(this));
		aside.addEventListener("mouseover", function(event) {
			if (event.target.nodeName == "H2") {
				hover = 0;
				note.innerHTML = "";
			} else if (element = event.target.closest("aside article")) {
				var index = element.index();
				if (index != hover) {
					hover = index;
					this.get(store[element.index() - 1], function(item) {
						note.scrollTop = 0;
						note.innerHTML = "<h1>" + item.title + "</h1>" + markdown(item.content);
					});
				}
			}
		}.bind(this));
		source.addEventListener("keyup", function(event) {
			preview.innerHTML = markdown(source.value);
			if (source.value.length - source.selectionEnd === 0)
				source.scrollTop = source.scrollHeight - source.clientHeight;
			scroll(source, preview);
			this.save();
		}.bind(this));
		title.addEventListener("keyup", function(event) {
			this.save();
		}.bind(this));
		source.addEventListener("scroll", function() {
			scroll(source, preview);
		});
		preview.addEventListener("scroll", function() {
			scroll(preview, source);
		});
		document.querySelector("#back").addEventListener("click", function() {
			this.close();
		}.bind(this));
		window.addEventListener("resize", inputs);
		/*
		document.querySelector("#switch-edit").addEventListener("click", function() {
			main.classList.add("edit");
		});
		document.querySelector("#switch-preview").addEventListener("click", function() {
			main.classList.remove("edit");
		});
		*/
		this.find(function(notes) {
			notes.forEach(display);
		});
	};
	var request = window.indexedDB.open("notes", 1);
	request.onupgradeneeded = function() {
		request.result.createObjectStore("notes", { keyPath: "time" });
	};
	request.onsuccess = function() {
		window.notes = new app(request.result);
	};
})();