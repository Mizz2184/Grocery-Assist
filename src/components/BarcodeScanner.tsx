import React, { useRef, useState, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Result, Exception } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { XCircle, Camera, RefreshCw } from "lucide-react";

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeDetected,
  onClose,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const codeReader = useRef<BrowserMultiFormatReader>(
    new BrowserMultiFormatReader()
  );
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);

  // Get available cameras
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setCameras(videoDevices);
        
        // Select rear camera by default if available (for mobile devices)
        const rearCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes("back") || 
          device.label.toLowerCase().includes("rear")
        );
        
        if (rearCamera) {
          setSelectedCamera(rearCamera.deviceId);
        } else if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error getting cameras:", err);
        setCameraError(true);
      }
    };

    getCameras();
  }, []);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (scanning) {
        // Use the static method to release all streams
        BrowserMultiFormatReader.releaseAllStreams();
      }
    };
  }, [scanning]);

  const startScanning = useCallback(() => {
    if (!webcamRef.current?.video) return;
    
    setScanning(true);
    setResult(null);

    const videoElement = webcamRef.current.video;

    codeReader.current
      .decodeFromVideoDevice(
        selectedCamera,
        videoElement,
        (result: Result | null, error: Exception | undefined) => {
          if (result) {
            const barcodeValue = result.getText();
            setResult(barcodeValue);
            setScanning(false);
            onBarcodeDetected(barcodeValue);
          }
          if (error && !(error instanceof Exception)) {
            console.error("Barcode scanning error:", error);
          }
        }
      )
      .catch((err) => {
        console.error("Error starting barcode scanner:", err);
        setCameraError(true);
        setScanning(false);
      });
  }, [selectedCamera, onBarcodeDetected]);

  const stopScanning = useCallback(() => {
    // Use the static method to release all streams
    BrowserMultiFormatReader.releaseAllStreams();
    setScanning(false);
  }, []);

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(e.target.value);
    if (scanning) {
      stopScanning();
    }
  };

  const videoConstraints = {
    deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
    facingMode: "environment", // Use the rear camera by default
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  if (cameraError) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Camera Access Error</h3>
          <p className="text-muted-foreground mb-4">
            Please ensure you've granted camera permissions and are using a secure (HTTPS) connection.
          </p>
          <Button onClick={onClose} variant="outline" className="w-full">
            Close Scanner
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <CardContent className="p-0 relative">
        <div className="relative aspect-[4/3] w-full bg-black">
          {cameras.length > 0 && (
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Scanning indicator */}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-1/4 border-2 border-primary rounded-lg animate-pulse"></div>
              <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 py-1">
                Position barcode in frame
              </div>
            </div>
          )}
          
          {result && (
            <div className="absolute bottom-4 left-4 right-4 bg-primary text-primary-foreground p-2 rounded">
              Barcode: {result}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 flex flex-col gap-3">
        {cameras.length > 1 && (
          <select
            value={selectedCamera}
            onChange={handleCameraChange}
            className="w-full p-2 rounded border mb-2"
          >
            {cameras.map((camera) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || `Camera ${camera.deviceId.slice(0, 5)}...`}
              </option>
            ))}
          </select>
        )}
        
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          
          {!scanning ? (
            <Button 
              variant="default" 
              className="flex-1" 
              onClick={startScanning}
            >
              <Camera className="mr-2 h-4 w-4" />
              Scan Barcode
            </Button>
          ) : (
            <Button 
              variant="default" 
              className="flex-1" 
              onClick={stopScanning}
            >
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Stop Scanning
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}; 