<%*
	let title = tp.file.title;

	const shortWords = [
		"A", "An", "The", "And", "But", "Or", "Nor", "As", "At", "By", "For", "In", "Of", "On",
		"Per", "To", "Vs", "Via", "If", "So", "Yet", "Off", "Up"
	];

	if (title.startsWith("Untitled")) {
		const notice = new tp.obsidian.Notice("Waiting for file rename...", 5000);

		let file = tp.config.target_file;

		let resolveFunc;
		const awaiter = new Promise(resolve => resolveFunc = resolve);

		function OnRename(file2, oldPath) {
			tp.app.vault.off("rename", OnRename);
			if (file2 !== file) return resolveFunc("");

			resolveFunc(file.basename);
		}

		tp.app.vault.on("rename", OnRename);

		title = await awaiter;
		title = title.replace(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/g, " ");
		title = title.split(" ").map((word, i, arr) => {
			if (i === 0 || i === arr.length - 1) return word;
			if (shortWords.includes(word)) return word.toLowerCase();
			return word;
		}).join(" ");

		notice.hide();
	}
_%>

---
aliases:
 - <%* tR += title; %>
tags:
  - TODO
---
# <%* tR += title; %>

<%*
	tR += tp.config.template_file.path === "Templates/DefaultProperties.md" ? tp.file.cursor() : "";
%>