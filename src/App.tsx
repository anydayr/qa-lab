import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import './App.css';
import { CheckCircle, XCircle } from 'lucide-react';

const Card: React.FC<{ title: string; count: number }> = ({ title, count }) => (
  <div className="card">
    <h3 style={{ fontSize: '40px', margin: 0 }} className="results">
      {count}
    </h3>
    <p>{title}</p>
  </div>
);

const App: React.FC = () => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [similaritiesCount, setSimilaritiesCount] = useState<number>(0);
  const [wordsInImage1Count, setWordsInImage1Count] = useState<number>(0);
  const [wordsInImage2Count, setWordsInImage2Count] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [comparisonList, setComparisonList] = useState<
    { word: string; isCommonInImage1: boolean; isCommonInImage2: boolean }[]
  >([]);

  const handleImageChange = (file: File | null, isImage1: boolean) => {
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      if (isImage1) {
        setImage1(imageUrl);
      } else {
        setImage2(imageUrl);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, isImage1: boolean) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleImageChange(file, isImage1);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isImage1: boolean) => {
    const file = e.target.files?.[0] || null;
    handleImageChange(file, isImage1);
  };

  const preprocessImage = (imageFile: string | null): Promise<string> => {
    return new Promise((resolve) => {
      if (!imageFile) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
            imageData.data[i] = avg;
            imageData.data[i + 1] = avg;
            imageData.data[i + 2] = avg;
          }
          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL());
        }
      };
      img.src = imageFile;
    });
  };

  const extractText = async (imageFile: string | null): Promise<string> => {
    if (!imageFile) {
      return '';
    }

    setIsScanning(true);
    try {
      const preprocessedImage = await preprocessImage(imageFile);
      const {
        data: { text }
      } = await Tesseract.recognize(preprocessedImage, 'spa', {
        logger: (info) => console.log(info)
      });
      setIsScanning(false);
      return text.trim();
    } catch (error) {
      console.error('Error durante el reconocimiento de texto:', error);
      alert('Ocurrió un error al procesar la imagen. Por favor, inténtalo de nuevo.');
      return '';
    }
  };

  const compareTexts = async () => {
    if (!image1 || !image2) {
      alert('Por favor, selecciona ambas imágenes.');
      return;
    }

    setLoading(true);
    setIsScanning(true); // Activar la animación de escaneo

    const textFromImage1 = await extractText(image1);
    const textFromImage2 = await extractText(image2);

    const wordsFromImage1 = textFromImage1.split(/\s+/).filter(Boolean);
    const wordsFromImage2 = textFromImage2.split(/\s+/).filter(Boolean);

    const setImageWords1 = new Set(wordsFromImage1);
    const setImageWords2 = new Set(wordsFromImage2);

    const comparisonResults = Array.from(setImageWords1).map((word) => ({
      word,
      isCommonInImage1: true,
      isCommonInImage2: setImageWords2.has(word)
    }));

    const additionalWordsInImage2 = Array.from(setImageWords2)
      .filter((word) => !setImageWords1.has(word))
      .map((word) => ({
        word,
        isCommonInImage1: false,
        isCommonInImage2: true
      }));

    setComparisonList([...comparisonResults, ...additionalWordsInImage2]);

    // Actualizar los contadores
    setSimilaritiesCount(comparisonResults.length + additionalWordsInImage2.length);
    setWordsInImage1Count(setImageWords1.size);
    setWordsInImage2Count(setImageWords2.size);

    setLoading(false);
    setIsScanning(false); // Desactivar la animación de escaneo
  };

  return (
    <div className="App">
      <h1> QA Lab - Mirror Mode</h1>

      {/* Mostrar las tarjetas con resultados */}
      <div style={{ width: '100%', display: 'flex', gap: '1rem', minWidth: '100%' }}>
        <div style={{ width: '50vw' }}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Card title="Similitudes Totales" count={similaritiesCount} />
            <Card title="Palabras en Imagen de Referencia" count={wordsInImage1Count} />
            <Card title="Palabras en Imagen de Desarrollo" count={wordsInImage2Count} />
          </div>
          <div className={isScanning ? `scan` : ''}>
            <div className="hand">
              <div className="lines">
                <div className="images-container">
                  <div
                    className="dropzone"
                    onDrop={(e) => handleDrop(e, true)}
                    onDragOver={handleDragOver}
                    onClick={() => document.getElementById('fileInput1')?.click()}>
                    <input
                      id="fileInput1"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileSelect(e, true)}
                    />
                    {image1 ? (
                      <img src={image1} alt="Imagen 1" className="preview" />
                    ) : (
                      <p>Imagen de referencia</p>
                    )}
                  </div>

                  <div
                    className="dropzone"
                    onDrop={(e) => handleDrop(e, false)}
                    onDragOver={handleDragOver}
                    onClick={() => document.getElementById('fileInput2')?.click()}>
                    <input
                      id="fileInput2"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileSelect(e, false)}
                    />
                    {image2 ? (
                      <img src={image2} alt="Imagen 2" className="preview" />
                    ) : (
                      <p>Imagen en desarrollo</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            {' '}
            <button
              onClick={compareTexts}
              disabled={loading || !image1 || !image2}
              style={{ marginRight: '2REM' }}>
              {loading ? 'Cargando...' : 'Compare'}
            </button>
            <button
              onClick={() => {
                setImage1('');
                setImage2('');
                setWordsInImage1Count(0);
                setWordsInImage2Count(0);
                setComparisonList([]);
                setSimilaritiesCount(0);
              }}
              disabled={loading || !image1 || !image2}
              style={{ background: 'red' }}>
              Reset
            </button>
          </div>
        </div>
        <div style={{ width: '40vw' }} className="table-container">
          {comparisonList.length > 0 && (
            <div style={{ maxHeight: '500px', overflowY: 'scroll' }}>
              <table>
                <thead>
                  <tr>
                    <th>Palabra</th>
                    <th>Imagen de Referencia</th>
                    <th>Imagen de Desarrollo</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonList.map(({ word, isCommonInImage1, isCommonInImage2 }) => (
                    <tr key={word}>
                      <td>{word}</td>
                      <td>{isCommonInImage1 ? <CheckCircle /> : <XCircle />}</td>
                      <td>{isCommonInImage2 ? <CheckCircle /> : <XCircle />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
