package com.mind.service;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpSession;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.mind.bean.ErrorBean;
import com.mind.bean.NoteBean;
import com.mind.bean.NotesBean;
import com.mind.dao.INoteDao;
import com.mind.dao.INotesHistoryDao;
import com.mind.dao.ITagNotesRelationDao;
import com.mind.entity.Notes;
import com.mind.entity.NotesHistory;
import com.mind.entity.TagNotesRelation;
import com.mind.utils.DateUtils;

@Service
public class NoteService {
	@Autowired
	private INoteDao noteDao;

	@Autowired
	private INotesHistoryDao notesHistoryDao;

	@Autowired
	ITagNotesRelationDao tagNotesRelationDao;

	@Transactional(propagation = Propagation.REQUIRED, rollbackFor = Throwable.class)
	public NoteBean save(NoteBean noteBean, HttpSession session) {
		if (session.getAttribute("id") == null) {
			noteBean.getErrorBeanList().add(new ErrorBean("", "用户未登录"));
		} else {
			Notes note = new Notes();
			if (noteBean.getNotesId() != null) {
				note = noteDao.findByNotesId(noteBean.getNotesId());
				note.setReminderTime(DateUtils.parse(
						noteBean.getReminderTime(), "yyyy-MM-dd HH:mm:ss"));
				note.setContent(noteBean.getContent());
				note.setStatus(noteBean.getStatus());
				note.setModifyTime(new Date());
			} else {
				note.setUserId((Integer) session.getAttribute("id"));
				note.setReminderTime(DateUtils.parse(
						noteBean.getReminderTime(), "yyyy-MM-dd HH:mm:ss"));
				note.setContent(noteBean.getContent());
				note.setStatus(noteBean.getStatus());
				note.setModifyTime(new Date());
				note.setCreateTime(new Date());
			}
			note = noteDao.save(note);
			noteBean.setNotesId(note.getNotesId());
			noteBean.setCreateTime(note.getCreateTime());

			NotesHistory notesHistory = new NotesHistory();
			notesHistory.setContent(noteBean.getContent());
			notesHistory.setModifyTime(new Date());
			notesHistory.setReminderTime(DateUtils.parse(
					noteBean.getReminderTime(), "yyyy-MM-dd HH:mm:ss"));
			notesHistory.setNotesId(note.getNotesId());
			notesHistory.setStatus(noteBean.getStatus());
			notesHistoryDao.save(notesHistory);
		}
		if (noteBean.getErrorBeanList().size() > 0) {
			noteBean.setSuccess(false);
		}
		return noteBean;
	}

	@Transactional(propagation = Propagation.REQUIRED, rollbackFor = Throwable.class)
	public void delete(Integer noteId) {
		noteDao.delete(noteId);
	}

	public NoteBean getNotes(HttpSession session) {
		NoteBean noteBean = new NoteBean();
		if (session.getAttribute("id") == null) {
			noteBean.getErrorBeanList().add(new ErrorBean("", "用户未登录"));
		} else {
			List<NotesBean> list = new ArrayList<>();
			List<Notes> entities = noteDao
					.findByUserIdOrderByCreateTimeDesc((Integer) session
							.getAttribute("id"));
			List<TagNotesRelation> tagList = tagNotesRelationDao.findAll();
			Map<Integer, List<String>> tagMap = new HashMap<>();
			for (TagNotesRelation tagNotesRelation : tagList) {
				List<String> tags = tagMap.get(tagNotesRelation.getNotesId());
				if (tags == null) {
					tags = new ArrayList<>();
				}
				tags.add(tagNotesRelation.getTagName());
				tagMap.put(tagNotesRelation.getNotesId(), tags);
			}
			for (Notes notes : entities) {
				NotesBean notesBean = new NotesBean();
				notesBean.setContent(notes.getContent());
				notesBean.setCreateTime(notes.getCreateTime());
				notesBean.setModifyTime(notes.getModifyTime());
				notesBean.setNotesId(notes.getNotesId());
				notesBean.setReminderTime(notes.getReminderTime());
				notesBean.setStatus(notes.getStatus());
				if (tagMap.get(notes.getNotesId()) != null) {
					notesBean.getTags().addAll(tagMap.get(notes.getNotesId()));
				}
				list.add(notesBean);
			}
			noteBean.getNoteList().addAll(list);
		}
		if (noteBean.getErrorBeanList().size() > 0) {
			noteBean.setSuccess(false);
		}
		return noteBean;
	}

	public NoteBean getNotesHistory(NoteBean noteBean) {
		List<NotesHistory> list = notesHistoryDao
				.findByNotesIdOrderByModifyTimeDesc(noteBean.getNotesId());
		noteBean.getNoteHistoryList().addAll(list);
		return noteBean;
	}
}