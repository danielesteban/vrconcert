#!/bin/bash

performances=$1
target_width=$2
target_height=$3

if [ -z "$1" ] ; then
  echo "Usage: $0 performaces [target_width] [target_height]"
  exit 1;
fi
if [ -z "$2" ] ; then
  target_width=640
fi
if [ -z "$3" ] ; then
  target_height=360
fi

shopt -s nullglob
count=(${performances}/*.mp4)
count=${#count[@]}

# Remove audio, scale & crop
inputs=""
mkdir -p tmp
for file in ${performances}/*.mp4
do
  # Get the size of input video:
  eval $(ffprobe -v error -of flat=s=_ -select_streams v:0 -show_entries stream=height,width ${file})
  input_width=${streams_stream_0_width}
  input_height=${streams_stream_0_height}
  # Get the difference between actual and desired size
  width_diff=$[ ${target_width} - ${input_width} ]
  height_diff=$[ ${target_height} - ${input_height} ]
  # Let's take the shorter side, so the video will be at least as big
  # as the desired size:
  crop="n"
  if [ ${width_diff} -lt ${height_diff} ] ; then
    scale="-2:${target_height}"
    crop="w"
  else
    scale="${target_width}:-2"
    crop="h"
  fi
  # Then perform a first resizing
  scaled=${file/$performances/tmp}
  scaled=${scaled/.mp4/.scaled.mp4}
  ffmpeg -i ${file} -vf scale=${scale} -an -y ${scaled}
  # Now get the scaled video size
  eval $(ffprobe -v error -of flat=s=_ -select_streams v:0 -show_entries stream=height,width ${scaled})
  input_width=${streams_stream_0_width}
  input_height=${streams_stream_0_height}
  # Calculate how much we should crop
  if [ "z${crop}" = "zh" ] ; then
    diff=$[ ${input_height} - ${target_height} ]
    crop="in_w:in_h-${diff}"
  elif [ "z${crop}" = "zw" ] ; then
    diff=$[ ${input_width} - ${target_width} ]
    crop="in_w-${diff}:in_h"
  fi
  cropped=${file/$performances/tmp}
  cropped=${cropped/.mp4/.cropped.mp4}
  ffmpeg -i ${scaled} -filter:v "crop=${crop}" -y ${cropped}
  inputs+=" -i ${cropped}" 
done

# Composite all together
ffmpeg ${inputs} -i ${performances}/*.mp3 \
  -filter_complex "hstack=inputs=${count}" \
  -y ${performances}_packed.webm
