import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  AspectRatio,
  Button,
  Gap,
  Grid,
  LoadingSpinner,
  Reorder,
  Spacer,
  TextInput,
  reorderItems,
} from '@avsync.live/formation';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import * as PDFJSWorker from 'pdfjs-dist/build/pdf.worker';
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJSWorker;

interface LoadedPage {
  pdfDoc: any;
  index: number;
  id: string;
  canvas: any;
  originalFileName: string;
  originalPageNumber: number;
}

const Home: React.FC = () => {
  const [loadedPages, setLoadedPages] = useState<LoadedPage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fileName, set_fileName] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onChange = (
    event: any,
    previousIndex: any,
    nextIndex: any,
    fromId: any,
    toId: any
  ) => {
    setLoadedPages((oldPages) => [
      ...reorderItems(oldPages, previousIndex, nextIndex),
    ]);
  };

  const loadPDFs = async () => {
    const inputFiles = fileInputRef.current?.files;
    if (!inputFiles) return;

    setIsLoading(true);

    let newLoadedPages: LoadedPage[] = [];

    for (let i = 0; i < inputFiles.length; i++) {
      const pdfBytes = await inputFiles[i].arrayBuffer();
      const pdfLibDoc = await PDFLibDocument.load(pdfBytes);
      const pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      const numPages = pdfJsDoc.numPages;

      for (let index = 1; index <= numPages; index++) {
        const id = `file-${i}-page-${index}`;
        const pageJs = await pdfJsDoc.getPage(index);
        const viewport = pageJs.getViewport({ scale: 1 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (context) {
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await pageJs.render(renderContext).promise;
        }

        newLoadedPages.push({
          pdfDoc: pdfLibDoc,
          index: index - 1,
          id,
          canvas,
          originalFileName: inputFiles[i].name,
          originalPageNumber: index,
        });
      }
    }

    setLoadedPages(newLoadedPages);
    setIsLoading(false);
  };

  const onDeletePage = (id: string) => {
    setLoadedPages((prevPages) => prevPages.filter((page) => page.id !== id));
  };

  const generatePDF = async () => {
    const newPdfDoc = await PDFLibDocument.create()
    for (const { pdfDoc, index } of loadedPages) {
      const [page] = await newPdfDoc.copyPages(pdfDoc, [index])
      newPdfDoc.addPage(page)
    }
    const modifiedPdfBytes = await newPdfDoc.save()
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName || 'untitled.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    const handleFileInput = async () => {
      await loadPDFs()
      const firstFile = fileInputRef.current?.files?.[0]
      if (firstFile) {
        set_fileName(`${firstFile.name.split('.')[0]} (edited)`)
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.addEventListener('change', handleFileInput)
    }

    return () => {
      if (fileInputRef.current) {
        fileInputRef.current.removeEventListener('change', handleFileInput)
      }
    }
  }, [])

  return (
    <div>
      <S.Header>
        <Gap>
          <S.Logo src='weave.svg' />
          <Button
            iconPrefix="fas"
            icon="file-circle-plus"
            text="Add documents"
            onClick={() => fileInputRef.current!.click()}
          />
          {isLoading ? <LoadingSpinner small /> : null}
          <Spacer />

          {
            loadedPages.length > 0 &&
              <Gap disableWrap autoWidth>
                <TextInput
                  value={fileName}
                  onChange={val => set_fileName(val)}
                  compact
                  placeholder='Name file'
                />
            
                <Button
                  iconPrefix="fas"
                  icon="download"
                  onClick={generatePDF}
                />
              </Gap>
          }
        </Gap>
        <input type="file" ref={fileInputRef} multiple hidden />
      </S.Header>

      <S.Pages>
        <Reorder
          reorderId="pages"
          maxItemWidth={14}
          gap={1}
          onChange={onChange}
          placeholder={<S.Placeholder />}
          holdTime={50}
        >
          {loadedPages.map(
            ({ id, canvas, originalFileName, originalPageNumber }, index) => (
              <S.Item>
                <AspectRatio ratio={8.5 / 11}>
                  <S.Page key={id}>
                    <S.PagePreview src={canvas.toDataURL()} alt={id} />
                    <S.Close>
                      <Button
                        icon="times"
                        iconPrefix="fas"
                        circle
                        onClick={() => onDeletePage(id)}
                      />
                    </S.Close>
                    <S.Center>
                      <S.PageNumber>{index + 1}</S.PageNumber>
                    </S.Center>
                  </S.Page>
                </AspectRatio>
                <S.PageInfo>
                  {originalFileName} - page {originalPageNumber}
                </S.PageInfo>
              </S.Item>
            )
          )}
        </Reorder>
              
        {
          (loadedPages.length == 0) &&
            <S.LogoBackdrop>
              <S.LogoHero src='weave.svg' />
            </S.LogoBackdrop>
        }
        
      </S.Pages>
    </div>
  );
};

export default Home;

const S = {
  Header: styled.div`
    width: calc(100% - 2rem);
    padding: 1rem;
    position: sticky;
    top: 0;
    background: var(--F_Background);
    z-index: 2;
    border-bottom: 1px solid var(--F_Surface);
  `,
  Logo: styled.img`
    width: 2.85rem;
    padding-right: .5rem;
  `,
  LogoBackdrop: styled.div`
    height: 40rem;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    opacity: .1;
  `,
  LogoHero: styled.img`
    width: 20rem;
  `,
  Pages: styled.div`
    padding: 1rem;
    width: calc(100% - 2rem);
  `,
  Item: styled.div`
    width: 100%;
  `,
  Center: styled.div`
    position: absolute;
    bottom: .25rem;
    width: 100%;
    display: flex;
    justify-content: center;
  `,
  PageNumber: styled.div`
    padding: .25rem .75rem;
    background: var(--F_Surface);
    border-radius: .5rem;
  `,
  PageInfo: styled.div`
    width: 100%;
    display: flex;
    justify-content: center;
    padding-top: .5rem;
    font-size: var(--F_Font_Size_Label);
    color: var(--F_Font_Color_Label);
  `,
  Page: styled.div`
    position: relative;
    height: 100%;
    width: 100%;
    background: var(--F_Surface_0);
  `,
  Close: styled.div`
    position: absolute;
    top: .25rem;
    right: .25rem;
  `,
  PagePreview: styled.img`
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
  `,
  Placeholder: styled.div`
    background: var(--F_Primary);
    width: 100%;
    height: 100%;
  `,
};
