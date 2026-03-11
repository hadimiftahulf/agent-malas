import 'dart:io';
import 'package:image/image.dart' as img;

void main() {
  // Load the original image
  final originalFile = File('assets/logo/source.png');
  final image = img.decodeImage(originalFile.readAsBytesSync());

  if (image == null) {
    print('Failed to load image');
    return;
  }

  // The original image is 1024x576. We want a 576x576 square.
  // We'll crop from the center horizontally, but slightly higher vertically (y=0) to focus on the robot and exclude the text.
  final width = 576;
  final height = 576;
  final xOffset = (image.width - width) ~/ 2;
  final yOffset = 0; // Top of the image

  final cropped = img.copyCrop(image, x: xOffset, y: yOffset, width: width, height: height);

  // Save the cropped image
  final outputFile = File('assets/logo/app_icon.png');
  outputFile.writeAsBytesSync(img.encodePng(cropped));
  
  print('Successfully cropped image: assets/logo/app_icon.png');
}
