# Builds CV-AminShabani.pdf — the exact filename served from the website,
# so a right-click "Save as" gets the same name as the download button.
# A copy is also placed at the repo root because /CV-AminShabani.pdf was
# the public URL for years and external links still point there.
PDF = CV-AminShabani.pdf
TEX = CV-AminShabani.tex

$(PDF): $(TEX)
	pdflatex -interaction=nonstopmode $(TEX)
	pdflatex -interaction=nonstopmode $(TEX)
	cp $(PDF) ../$(PDF)

.PHONY: clean
clean:
	rm -f *.aux *.log *.out *.fls *.fdb_latexmk *.synctex.gz
