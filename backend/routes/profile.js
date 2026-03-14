import express from 'express';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();


router.post('/request-password-reset', async (req, res) => {
  try {
    const { resetContact } = req.body;

    const trimmedResetContact = resetContact?.trim();

    if (!trimmedResetContact) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required',
      });
    }

    const user = await User.findOne({
      $or: [
        { email: trimmedResetContact.toLowerCase() },
        { phone: trimmedResetContact },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that email or phone number',
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: 'This account does not have a valid email address for reset',
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'ShelfSafe Password Reset',
      html: `
        <p>Hello ${user.name || 'User'},</p>
        <p>You requested a password reset for your ShelfSafe account.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset link sent successfully',
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send reset link',
    });
  }
});




router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        userRole: user.userRole,
        pharmacyOrganization: user.pharmacyOrganization,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        notifications: user.notifications,
        twoFactorEnabled: user.twoFactorEnabled,
        recentActivity: user.recentActivity.slice(-10),
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
});


router.put('/', verifyToken, async (req, res) => {
  try {
    const { name, employeeId, userRole, phone, pharmacyOrganization, notifications, password, twoFactorEnabled } = req.body;

    const updateFields = {};

    if (name !== undefined) updateFields.name = name.trim();
    if (employeeId !== undefined) updateFields.employeeId = employeeId.trim();
    if (userRole !== undefined) updateFields.userRole = userRole.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (pharmacyOrganization !== undefined) {
      updateFields.pharmacyOrganization = pharmacyOrganization.trim();
    }

    if (notifications !== undefined) {
      updateFields.notifications = notifications;
    }

    if (twoFactorEnabled !== undefined) {
      updateFields.twoFactorEnabled = twoFactorEnabled;
    }

    if (password !== undefined && password.trim() !== '') {
      updateFields.password = await bcryptjs.hash(password.trim(), 10);
    }

    const updateResult = await User.updateOne(
      { _id: req.user.userId },
      {
        $set: updateFields,
        $push: {
          recentActivity: {
            action: 'Updated profile details',
            timestamp: new Date(),
          },
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const updatedUser = await User.findById(req.user.userId).lean();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        employeeId: updatedUser.employeeId,
        userRole: updatedUser.userRole,
        pharmacyOrganization: updatedUser.pharmacyOrganization,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatarUrl,
        notifications: updatedUser.notifications,
        twoFactorEnabled: updatedUser.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
});

export const requestPasswordReset = async (resetContact) => {
  const response = await fetch(`${API_BASE_URL}/profile/request-password-reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resetContact }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to send reset link');
  }

  return data;
};

export default router;